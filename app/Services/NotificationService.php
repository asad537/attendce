<?php

namespace App\Services;

use App\Events\NewNotification;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public static function send(
        User $recipient,
        string $title,
        string $message,
        string $type = 'info',
        ?string $actionUrl = null,
        ?object $notifiable = null
    ): Notification {
        $notif = Notification::create([
            'user_id'         => $recipient->id,
            'title'           => $title,
            'message'         => $message,
            'type'            => $type,
            'action_url'      => $actionUrl,
            'notifiable_id'   => $notifiable ? $notifiable->id : null,
            'notifiable_type' => $notifiable ? get_class($notifiable) : null,
        ]);

        // Broadcast real-time notification
        try {
            broadcast(new NewNotification($notif))->toOthers();
        } catch (\Exception $e) {
            // Broadcasting may not be available in all environments
        }

        return $notif;
    }

    /**
     * Notify every active user in the organisation (optionally excluding some IDs).
     */
    public static function notifyAll(string $title, string $message, string $type = 'info', ?object $notifiable = null, array $exceptIds = []): void
    {
        User::active()
            ->when(!empty($exceptIds), function ($q) use ($exceptIds) {
                $q->whereNotIn('id', $exceptIds);
            })
            ->each(function (User $user) use ($title, $message, $type, $notifiable) {
                self::send($user, $title, $message, $type, null, $notifiable);
            });
    }

    public static function notifyManagers(string $title, string $message, string $type = 'info', ?object $notifiable = null): void
    {
        User::byRole('manager')->active()->each(function (User $mgr) use ($title, $message, $type, $notifiable) {
            self::send($mgr, $title, $message, $type, null, $notifiable);
        });
    }

    public static function notifyCeo(string $title, string $message, string $type = 'info', ?object $notifiable = null, ?string $actionUrl = null): void
    {
        User::byRole('ceo')->active()->each(function (User $ceo) use ($title, $message, $type, $notifiable, $actionUrl) {
            self::send($ceo, $title, $message, $type, $actionUrl, $notifiable);
        });
    }

    public static function notifyManagersAndCeo(string $title, string $message, string $type = 'info', ?object $notifiable = null): void
    {
        self::notifyManagers($title, $message, $type, $notifiable);
        self::notifyCeo($title, $message, $type, $notifiable);
    }
}
