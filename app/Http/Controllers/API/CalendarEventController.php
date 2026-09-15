<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarEventController extends Controller
{
    public function index(Request $request): JsonResponse { 
        $user = $request->user();
        $isManager = in_array($user->role, ['ceo', 'manager', 'tl']);
        $events = CalendarEvent::orderBy('event_date')->orderBy('event_time')->get()->filter(function ($event) use ($user, $isManager) {
            if (empty($event->attendees)) return true;
            if ($isManager) return true;
            return in_array($user->id, $event->attendees);
        })->values();
        return response()->json(['events' => $events->map(fn ($event) => $this->format($event))]); 
    }
    public function store(Request $request): JsonResponse {
        abort_unless(in_array($request->user()->role, ['ceo','manager','tl']), 403);
        $event = CalendarEvent::create($this->payload($request) + ['created_by' => $request->user()->id]);
        NotificationService::notifyAll('New calendar agenda', $event->title . ' is scheduled for ' . $event->event_date . '.', 'info', $event);
        return response()->json(['event' => $this->format($event)], 201);
    }
    public function update(Request $request, CalendarEvent $calendarEvent): JsonResponse {
        abort_unless(in_array($request->user()->role, ['ceo','manager','tl']) && $calendarEvent->created_by === $request->user()->id, 403);
        $calendarEvent->update($this->payload($request));
        NotificationService::notifyAll('Calendar agenda updated', $calendarEvent->title . ' has been updated.', 'info', $calendarEvent);
        return response()->json(['event' => $this->format($calendarEvent)]);
    }
    public function destroy(Request $request, CalendarEvent $calendarEvent): JsonResponse { abort_unless(in_array($request->user()->role, ['ceo','manager','tl']) && $calendarEvent->created_by === $request->user()->id, 403); $calendarEvent->delete(); return response()->json(['message' => 'Agenda deleted.']); }
    private function validated(Request $request): array { return $request->validate(['title'=>'required|string|max:200','date'=>'required|date','time'=>'nullable|string|max:20','type'=>'required|string|max:80','location'=>'nullable|string|max:500','note'=>'nullable|string|max:5000', 'attendees'=>'nullable|array', 'attendees.*'=>'integer']); }
    private function payload(Request $request): array { $data = $this->validated($request); return ['title' => $data['title'], 'event_date' => $data['date'], 'event_time' => $data['time'] ?? null, 'type' => $data['type'], 'location' => $data['location'] ?? null, 'note' => $data['note'] ?? null, 'attendees' => $data['attendees'] ?? null]; }
    private function format(CalendarEvent $event): array { 
        $attendeeUsers = [];
        if (!empty($event->attendees)) {
            $attendeeUsers = \App\Models\User::whereIn('id', $event->attendees)->get(['id', 'name', 'avatar'])->map(function($u) {
                return ['id' => $u->id, 'name' => $u->name, 'avatar' => $u->avatar_url];
            })->toArray();
        } else {
            $attendeeUsers = \App\Models\User::active()->get(['id', 'name', 'avatar'])->map(function($u) {
                return ['id' => $u->id, 'name' => $u->name, 'avatar' => $u->avatar_url];
            })->toArray();
        }
        return ['id'=>$event->id,'created_by'=>$event->created_by,'title'=>$event->title,'date'=>$event->event_date->format('Y-m-d'),'time'=>$event->event_time ?? '', 'type'=>$event->type,'location'=>$event->location ?? '', 'note'=>$event->note ?? '', 'attendees'=>$event->attendees ?? [], 'attendee_users' => $attendeeUsers]; 
    }
}
