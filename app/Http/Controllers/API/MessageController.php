<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $folder = $request->get('folder', 'inbox');
        $query = Message::with(['sender:id,name,email,avatar', 'recipient:id,name,email,avatar'])->latest();

        if ($folder === 'sent') {
            $query->where('sender_id', $user->id)->where('is_draft', false)->whereNull('deleted_by_sender_at');
        } elseif ($folder === 'drafts') {
            $query->where('sender_id', $user->id)->where('is_draft', true)->whereNull('deleted_by_sender_at');
        } elseif ($folder === 'starred') {
            $query->where(function ($q) use ($user) {
                $q->where(fn ($x) => $x->where('recipient_id', $user->id)->whereNotNull('starred_by_recipient_at')->whereNull('deleted_by_recipient_at'))
                  ->orWhere(fn ($x) => $x->where('sender_id', $user->id)->whereNotNull('starred_by_sender_at')->whereNull('deleted_by_sender_at'));
            })->where('is_draft', false);
        } elseif ($folder === 'trash') {
            $query->where(function ($q) use ($user) {
                $q->where(fn ($x) => $x->where('recipient_id', $user->id)->whereNotNull('deleted_by_recipient_at'))
                  ->orWhere(fn ($x) => $x->where('sender_id', $user->id)->whereNotNull('deleted_by_sender_at'));
            });
        } elseif ($folder === 'spam') {
            $query->where('recipient_id', $user->id)->whereNotNull('spam_at')->whereNull('deleted_by_recipient_at');
        } else {
            $query->where('recipient_id', $user->id)->where('is_draft', false)->whereNull('archived_at')->whereNull('spam_at')->whereNull('deleted_by_recipient_at');
        }

        if ($request->filled('search')) {
            $search = $request->string('search')->trim();
            $query->where(fn ($q) => $q->where('subject', 'like', "%{$search}%")->orWhere('body', 'like', "%{$search}%")->orWhereHas('sender', fn ($u) => $u->where('name', 'like', "%{$search}%")));
        }

        return response()->json([
            'messages' => $query->limit(100)->get()->map(fn ($message) => $this->format($message, $user->id)),
            'counts' => $this->counts($user->id),
        ]);
    }

    public function recipients(Request $request): JsonResponse
    {
        $users = User::active()->with('designation:id,title')->whereKeyNot($request->user()->id)->orderBy('name')->get(['id', 'name', 'email', 'avatar', 'role', 'designation_id']);
        return response()->json(['users' => $users->map(fn ($user) => $this->userPayload($user))]);
    }

    public function conversations(Request $request): JsonResponse
    {
        $current = $request->user();
        $search = trim((string) $request->get('search', ''));
        $users = User::active()->with('designation:id,title')->whereKeyNot($current->id)
            ->when($search, fn ($query) => $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")))
            ->orderBy('name')->get(['id', 'name', 'email', 'avatar', 'role', 'designation_id']);

        $conversations = $users->map(function ($user) use ($current) {
            $base = Message::where('is_draft', false)->where(function ($query) use ($current, $user) {
                $query->where(fn ($q) => $q->where('sender_id', $current->id)->where('recipient_id', $user->id))
                    ->orWhere(fn ($q) => $q->where('sender_id', $user->id)->where('recipient_id', $current->id));
            });
            $latest = (clone $base)->latest()->first();
            $unread = (clone $base)->where('sender_id', $user->id)->where('recipient_id', $current->id)->whereNull('read_at')->count();
            return [
                'user' => $this->userPayload($user),
                'last_message' => $latest ? [
                    'id' => $latest->id, 'body' => $this->preview($latest), 'subject' => $latest->subject,
                    'created_at' => $latest->created_at, 'sent_by_me' => $latest->sender_id === $current->id,
                ] : null,
                'unread_count' => $unread,
            ];
        })->sortByDesc(fn ($conversation) => $conversation['last_message']['created_at'] ?? null)->values();

        return response()->json(['conversations' => $conversations]);
    }

    public function thread(Request $request, User $user): JsonResponse
    {
        $current = $request->user();
        abort_if($user->id === $current->id || $user->status !== 'active', 404);

        Message::where('sender_id', $user->id)->where('recipient_id', $current->id)->whereNull('read_at')->update(['read_at' => now()]);
        $messages = Message::with(['sender:id,name,email,avatar', 'recipient:id,name,email,avatar'])
            ->where('is_draft', false)
            ->where(function ($query) use ($current, $user) {
                $query->where(fn ($q) => $q->where('sender_id', $current->id)->where('recipient_id', $user->id)->whereNull('deleted_by_sender_at'))
                    ->orWhere(fn ($q) => $q->where('sender_id', $user->id)->where('recipient_id', $current->id)->whereNull('deleted_by_recipient_at'));
            })->oldest()->limit(500)->get();

        return response()->json([
            'user' => $this->userPayload($user->loadMissing('designation:id,title')),
            'messages' => $messages->map(fn ($message) => $this->format($message, $current->id)),
        ]);
    }

    public function typing(Request $request): JsonResponse
    {
        $data = $request->validate(['recipient_id' => 'required|exists:users,id']);
        $sender = $request->user();
        $recipient = User::active()->findOrFail($data['recipient_id']);
        abort_if($sender->id === $recipient->id, 422, 'You cannot message yourself.');

        Cache::put($this->typingKey($sender->id, $recipient->id), true, now()->addSeconds(4));

        return response()->json(['typing' => true]);
    }

    public function typingStatus(Request $request, User $user): JsonResponse
    {
        $recipient = $request->user();
        abort_if($user->id === $recipient->id || $user->status !== 'active', 404);

        return response()->json(['typing' => Cache::has($this->typingKey($user->id, $recipient->id))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'recipient_id' => 'nullable|required_unless:is_draft,true|exists:users,id',
            'subject' => 'nullable|string|max:200', 'body' => 'nullable|string|max:20000',
            'label' => 'nullable|in:hr,leave,interview,admin', 'is_draft' => 'sometimes|boolean',
            'parent_id' => 'nullable|exists:messages,id',
            'attachment' => 'nullable|file|max:10240',
        ]);
        abort_if(isset($data['recipient_id']) && (int) $data['recipient_id'] === (int) $request->user()->id, 422, 'You cannot message yourself.');
        abort_if(trim($data['body'] ?? '') === '' && ! $request->hasFile('attachment'), 422, 'Message cannot be empty.');

        $attachment = [];
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $attachment = [
                'attachment_path' => $file->store('chat-attachments', 'public'),
                'attachment_name' => $file->getClientOriginalName(),
                'attachment_mime' => $file->getMimeType(),
                'attachment_size' => $file->getSize(),
            ];
        }

        $message = Message::create([
            'sender_id' => $request->user()->id, 'recipient_id' => $data['recipient_id'] ?? null,
            'subject' => trim($data['subject'] ?? '') ?: '(No subject)', 'body' => $data['body'] ?? '',
            'label' => $data['label'] ?? null, 'is_draft' => (bool) ($data['is_draft'] ?? false),
            'parent_id' => $data['parent_id'] ?? null,
        ] + $attachment);
        Cache::forget($this->typingKey($request->user()->id, $message->recipient_id));
        if (! $message->is_draft && $message->recipient_id) {
            NotificationService::send(
                $message->recipient,
                'New message',
                $request->user()->name . ' sent you a message' . (trim((string) $message->body) !== '' ? ': ' . Str::limit(trim((string) $message->body), 90) : ' with an attachment.'),
                'info',
                '/inbox',
                $message
            );
        }
        return response()->json(['message' => $this->format($message->load(['sender', 'recipient']), $request->user()->id)], 201);
    }

    public function update(Request $request, Message $message): JsonResponse
    {
        $userId = $request->user()->id;
        abort_unless($message->sender_id === $userId || $message->recipient_id === $userId, 403);
        $data = $request->validate(['action' => 'required|in:read,unread,star,unstar,archive,unarchive,spam,not_spam']);
        if ($data['action'] === 'read' && $message->recipient_id === $userId) $message->read_at = now();
        if ($data['action'] === 'unread' && $message->recipient_id === $userId) $message->read_at = null;
        if (in_array($data['action'], ['star', 'unstar'])) {
            $field = $message->sender_id === $userId ? 'starred_by_sender_at' : 'starred_by_recipient_at';
            $message->{$field} = $data['action'] === 'star' ? now() : null;
        }
        if (in_array($data['action'], ['archive', 'unarchive']) && $message->recipient_id === $userId) $message->archived_at = $data['action'] === 'archive' ? now() : null;
        if (in_array($data['action'], ['spam', 'not_spam']) && $message->recipient_id === $userId) $message->spam_at = $data['action'] === 'spam' ? now() : null;
        $message->save();
        return response()->json(['message' => $this->format($message->load(['sender', 'recipient']), $userId)]);
    }

    public function destroy(Request $request, Message $message): JsonResponse
    {
        $userId = $request->user()->id;
        abort_unless($message->sender_id === $userId || $message->recipient_id === $userId, 403);

        // Delete for everyone — only the sender can unsend, and only if not already gone.
        if ($request->query('scope') === 'everyone') {
            abort_unless($message->sender_id === $userId, 403, 'Only the sender can delete for everyone.');
            if ($message->attachment_path) Storage::disk('public')->delete($message->attachment_path);
            $message->forceFill([
                'body' => '', 'attachment_path' => null, 'attachment_name' => null,
                'attachment_mime' => null, 'attachment_size' => null, 'deleted_for_everyone_at' => now(),
            ])->save();
            return response()->json(['message' => 'Message deleted for everyone.']);
        }

        // Delete for me — hide only from the current user's side.
        if ($message->sender_id === $userId) $message->deleted_by_sender_at = now();
        if ($message->recipient_id === $userId) $message->deleted_by_recipient_at = now();
        $message->save();
        return response()->json(['message' => 'Message moved to trash.']);
    }

    private function userPayload(?User $user): ?array
    {
        if (! $user) return null;
        return [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'role' => $user->role, 'designation' => optional($user->designation)->title,
            'avatar' => $user->avatar_url, 'avatar_url' => $user->avatar_url,
        ];
    }

    private function typingKey(int $senderId, int $recipientId): string
    {
        return "chat-typing:{$senderId}:{$recipientId}";
    }

    private function preview(Message $message): string
    {
        if ($message->deleted_for_everyone_at) return 'This message was deleted';
        if (trim((string) $message->body) !== '') return $message->body;
        if ($message->attachment_path) {
            return str_starts_with((string) $message->attachment_mime, 'image/') ? '📷 Photo' : '📎 ' . ($message->attachment_name ?: 'Attachment');
        }
        return $message->body ?? '';
    }

    private function counts(int $userId): array
    {
        return [
            'inbox' => Message::where('recipient_id', $userId)->where('is_draft', false)->whereNull('archived_at')->whereNull('spam_at')->whereNull('deleted_by_recipient_at')->count(),
            'unread' => Message::where('recipient_id', $userId)->whereNull('read_at')->whereNull('deleted_by_recipient_at')->count(),
            'starred' => Message::where(fn ($q) => $q->where('recipient_id', $userId)->whereNotNull('starred_by_recipient_at')->orWhere('sender_id', $userId)->whereNotNull('starred_by_sender_at'))->count(),
            'sent' => Message::where('sender_id', $userId)->where('is_draft', false)->whereNull('deleted_by_sender_at')->count(),
            'drafts' => Message::where('sender_id', $userId)->where('is_draft', true)->whereNull('deleted_by_sender_at')->count(),
            'spam' => Message::where('recipient_id', $userId)->whereNotNull('spam_at')->whereNull('deleted_by_recipient_at')->count(),
            'trash' => Message::where(fn ($q) => $q->where('recipient_id', $userId)->whereNotNull('deleted_by_recipient_at')->orWhere('sender_id', $userId)->whereNotNull('deleted_by_sender_at'))->count(),
        ];
    }

    private function format(Message $message, int $userId): array
    {
        $sent = $message->sender_id === $userId;
        $deleted = (bool) $message->deleted_for_everyone_at;
        $attachment = null;
        if (! $deleted && $message->attachment_path) {
            $attachment = [
                'url' => '/storage/' . ltrim($message->attachment_path, '/'),
                'name' => $message->attachment_name,
                'mime' => $message->attachment_mime,
                'size' => (int) $message->attachment_size,
                'is_image' => str_starts_with((string) $message->attachment_mime, 'image/'),
            ];
        }
        return [
            'id' => $message->id, 'subject' => $message->subject,
            'body' => $deleted ? '' : $message->body, 'label' => $message->label,
            'is_draft' => $message->is_draft, 'is_read' => $sent || (bool) $message->read_at,
            'is_starred' => (bool) ($sent ? $message->starred_by_sender_at : $message->starred_by_recipient_at),
            'is_deleted' => $deleted, 'attachment' => $attachment,
            'sender' => $this->userPayload($message->sender), 'recipient' => $this->userPayload($message->recipient), 'created_at' => $message->created_at,
        ];
    }
}
