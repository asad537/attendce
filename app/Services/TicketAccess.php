<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectTicket;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/**
 * Who may see / manage which tickets.
 *
 * - President, managers and the project's creator: everything in the project.
 * - A team lead (a lead on the project, or any TL-role user with a department)
 *   works department-wise: tickets they created, tickets assigned to them, and
 *   tickets assigned to anyone in THEIR department — whoever created them
 *   (so a ticket the President gives to an employee shows up for that
 *   employee's TL). Tickets another department's TL assigned stay hidden.
 * - Everyone else: only tickets assigned to them.
 */
class TicketAccess
{
    public static function isFullAccess(User $user, Project $project): bool
    {
        return $user->isCeo() || $user->isManager() || (int) $project->created_by === (int) $user->id;
    }

    /** Lead of this project, or a TL who supervises a department. */
    public static function isLeadLike(User $user, Project $project): bool
    {
        return $project->isLead($user->id) || ($user->isTl() && $user->department_id);
    }

    public static function canManageProject(User $user, Project $project): bool
    {
        return self::isFullAccess($user, $project) || $project->isLead($user->id);
    }

    /** Limit a ticket query to what this user may see in the project. */
    public static function scopeVisible(Builder $query, User $user, Project $project): Builder
    {
        if (self::isFullAccess($user, $project)) {
            return $query;
        }
        if (self::isLeadLike($user, $project)) {
            return $query->where(function ($q) use ($user) {
                $q->where('created_by', $user->id)->orWhere('assignee_id', $user->id);
                if ($user->department_id) {
                    $q->orWhereHas('assignee', fn ($a) => $a->where('department_id', $user->department_id));
                }
            });
        }
        return $query->where('assignee_id', $user->id);
    }

    public static function canViewProject(User $user, Project $project): bool
    {
        if (self::canManageProject($user, $project)) {
            return true;
        }
        return self::scopeVisible(ProjectTicket::where('project_id', $project->id), $user, $project)->exists();
    }

    /** Edit / rate / move to Done / attachments. */
    public static function canManageTicket(User $user, ProjectTicket $ticket): bool
    {
        $project = $ticket->project ?? $ticket->project()->first();
        if (!$project) {
            return false;
        }
        if (self::isFullAccess($user, $project)) {
            return true;
        }
        if (!self::isLeadLike($user, $project)) {
            return false;
        }
        if ((int) $ticket->created_by === (int) $user->id || (int) $ticket->assignee_id === (int) $user->id) {
            return true;
        }
        return self::assigneeInDepartment($ticket, $user);
    }

    /** See the ticket, its activity, comments and subtasks. */
    public static function canViewTicket(User $user, ProjectTicket $ticket): bool
    {
        return (int) $ticket->assignee_id === (int) $user->id || self::canManageTicket($user, $ticket);
    }

    private static function assigneeInDepartment(ProjectTicket $ticket, User $user): bool
    {
        if (!$user->department_id || !$ticket->assignee_id) {
            return false;
        }
        $assignee = $ticket->relationLoaded('assignee') ? $ticket->assignee : User::find($ticket->assignee_id);
        return $assignee && (int) $assignee->department_id === (int) $user->department_id;
    }
}
