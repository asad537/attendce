import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../services/api";
import { userService } from "../../services/userService";
import { useAuth } from "../../contexts/AuthContext";
import { projectService } from "../../services/projectService";
import Modal from "../../components/common/Modal";
import TicketModal from "../../components/common/TicketModal";
import { User } from "../../types";

type Ticket = {
    id: number;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "in_review" | "done";
    priority?: "low" | "medium" | "high" | "urgent";
    due_date?: string;
    attachment_path?: string;
    attachment_name?: string;
    assignee?: { id: number; name: string };
};
const cols = [
    { key: "todo", name: "To Do" },
    { key: "in_progress", name: "In Progress" },
    { key: "in_review", name: "In Review" },
    { key: "done", name: "Done" },
] as const;

export default function ProjectTickets() {
    const { user: currentUser } = useAuth();
    const { projectId } = useParams();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [projectName, setProjectName] = useState("Project");
    const [open, setOpen] = useState(false);
    const [detail, setDetail] = useState<Ticket | null>(null);
    const [editing, setEditing] = useState<Ticket | null>(null);
    const [subtasks, setSubtasks] = useState<{id:number, title:string, is_completed:boolean}[]>([]);
    const [newSubtask, setNewSubtask] = useState("");
    const [form, setForm] = useState({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        assignee_id: "",
    });
    const load = async () => {
        try {
            const [t, u, p] = await Promise.all([
                api.get(`/projects/${projectId}/tickets`),
                userService.getList({ per_page: 200 }),
                projectService.getAll(),
            ]);
            setTickets(t.data.tickets);
            setUsers(
                u.data.filter((user) =>
                    currentUser?.role === "ceo"
                        ? ["manager", "tl"].includes(user.role)
                        : ["tl", "employee"].includes(user.role),
                ),
            );
            setProjectName(
                p.find((project) => project.id === Number(projectId))?.name ||
                    "Project",
            );
        } catch (e) {
            toast.error(getErrorMessage(e));
        }
    };
    useEffect(() => {
        load();
    }, [projectId]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editing)
                await api.put(`/tickets/${editing.id}`, {
                    ...form,
                    assignee_id: form.assignee_id || null,
                });
            else
                await api.post(`/projects/${projectId}/tickets`, {
                    ...form,
                    assignee_id: form.assignee_id || null,
                });
            setOpen(false);
            setEditing(null);
            setForm({
                title: "",
                description: "",
                status: "todo",
                priority: "medium",
                assignee_id: "",
            });
            load();
            toast.success("Ticket saved.");
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const updatePriority = async (ticket: Ticket, newPriority: string) => {
        try {
            await api.put(`/tickets/${ticket.id}`, {
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: newPriority,
                assignee_id: ticket.assignee?.id || null,
            });
            load();
            toast.success("Priority updated");
        } catch (err) {
            toast.error("Failed to update priority");
        }
    };

    const updateAssignee = async (ticket: Ticket, newAssigneeId: string) => {
        try {
            await api.put(`/tickets/${ticket.id}`, {
                title: ticket.title,
                description: ticket.description,
                status: ticket.status,
                priority: ticket.priority || "medium",
                assignee_id: newAssigneeId || null,
            });
            load();
            toast.success("Assignee updated");
        } catch (err) {
            toast.error("Failed to update assignee");
        }
    };

    const uploadAttachment = async (ticket: Ticket, file: File) => {
        try {
            const data = new FormData();
            data.append("title", ticket.title);
            data.append("description", ticket.description || "");
            data.append("status", ticket.status);
            data.append("priority", ticket.priority || "medium");
            data.append("assignee_id", String(ticket.assignee?.id || ""));
            data.append("attachment", file);
            await api.put(`/tickets/${ticket.id}`, data, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Attachment uploaded.");
            load();
            setDetail(null);
        } catch (err) {
            toast.error(getErrorMessage(err));
        }
    };

    const loadSubtasks = async (ticketId: number) => {
        try {
            const res = await api.get(`/tickets/${ticketId}/subtasks`);
            setSubtasks(res.data.subtasks || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (detail?.id) {
            loadSubtasks(detail.id);
        } else {
            setSubtasks([]);
            setNewSubtask("");
        }
    }, [detail?.id]);

    const handleAddSubtask = async (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && newSubtask.trim() && detail) {
            try {
                await api.post(`/tickets/${detail.id}/subtasks`, { title: newSubtask.trim(), is_completed: false });
                setNewSubtask("");
                loadSubtasks(detail.id);
            } catch (err) {
                toast.error("Failed to add subtask");
            }
        }
    };

    const toggleSubtask = async (subtaskId: number, completed: boolean) => {
        try {
            await api.put(`/ticket-subtasks/${subtaskId}`, { is_completed: completed });
            if (detail) loadSubtasks(detail.id);
        } catch (err) {
            toast.error("Failed to update subtask");
        }
    };

    const getPriorityIcon = (p?: string) => {
        if (p === "high" || p === "urgent")
            return (
                <span className="text-red-500 font-bold text-lg leading-none cursor-pointer pt-1">
                    ↑
                </span>
            );
        if (p === "low")
            return (
                <span className="text-blue-500 font-bold text-lg leading-none cursor-pointer pt-1">
                    ↓
                </span>
            );
        return (
            <span className="text-orange-500 font-bold text-lg leading-none cursor-pointer pt-1">
                =
            </span>
        ); // medium/default
    };

    return (
        <div className="space-y-5">
            <div className="card flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold text-indigo-600">
                        PROJECT WORKSPACE
                    </p>
                    <h1 className="text-2xl font-bold">{projectName}</h1>
                    <p className="text-sm text-gray-500">
                        Tickets Board · Create tickets and assign them to your
                        team.
                    </p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setEditing(null);
                        setForm({
                            title: "",
                            description: "",
                            status: "todo",
                            priority: "medium",
                            assignee_id: "",
                        });
                        setOpen(true);
                    }}
                >
                    + Create ticket
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
                {cols.map((c) => (
                    <div
                        key={c.key}
                        className="min-h-72 rounded-xl bg-gray-100/50 p-3"
                    >
                        <div className="mb-3 flex justify-between font-semibold text-gray-700">
                            <span>
                                {c.name}{" "}
                                <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                                    {
                                        tickets.filter(
                                            (t) => t.status === c.key,
                                        ).length
                                    }
                                </span>
                            </span>
                        </div>
                        {tickets
                            .filter((t) => t.status === c.key)
                            .map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => setDetail(t)}
                                    className="mb-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <p className="font-medium text-[14px] leading-5 text-gray-900 pr-2">
                                            {t.title}
                                        </p>
                                        <div className="flex gap-1 text-gray-500 shrink-0">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditing(t);
                                                    setForm({
                                                        title: t.title,
                                                        description:
                                                            t.description || "",
                                                        status: t.status,
                                                        priority:
                                                            t.priority ||
                                                            "medium",
                                                        assignee_id:
                                                            t.assignee?.id?.toString() ||
                                                            "",
                                                    });
                                                    setOpen(true);
                                                }}
                                                className="hover:bg-gray-100 p-1 rounded transition-colors"
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                    />
                                                </svg>
                                            </button>
                                            <button
                                                className="hover:bg-gray-100 p-1 rounded transition-colors"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <svg
                                                    className="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-0 bg-white text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            />
                                            <span className="text-[12px] font-semibold text-gray-500">
                                                KAN-{t.id}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="relative inline-flex items-center justify-center w-6 h-6 hover:bg-gray-100 rounded transition-colors"
                                                title={`Priority: ${t.priority || "medium"}`}
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <select
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    value={
                                                        t.priority || "medium"
                                                    }
                                                    onChange={(e) =>
                                                        updatePriority(
                                                            t,
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="low">
                                                        Low
                                                    </option>
                                                    <option value="medium">
                                                        Medium
                                                    </option>
                                                    <option value="high">
                                                        High
                                                    </option>
                                                    <option value="urgent">
                                                        Urgent
                                                    </option>
                                                </select>
                                                {getPriorityIcon(t.priority)}
                                            </div>
                                            <div
                                                className="relative inline-flex h-7 max-w-36 items-center justify-center truncate whitespace-nowrap rounded-md bg-indigo-50 px-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                                                title={
                                                    t.assignee?.name ||
                                                    "Unassigned"
                                                }
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <select
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    value={t.assignee?.id || ""}
                                                    onChange={(e) =>
                                                        updateAssignee(
                                                            t,
                                                            e.target.value,
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Unassigned
                                                    </option>
                                                    {users.map((u) => (
                                                        <option
                                                            key={u.id}
                                                            value={u.id}
                                                        >
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {t.assignee?.name || "Assign"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        <button
                            className="w-full rounded-lg hover:bg-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors"
                            onClick={() => {
                                setEditing(null);
                                setForm({
                                    title: "",
                                    description: "",
                                    status: c.key,
                                    priority: "medium",
                                    assignee_id: "",
                                });
                                setOpen(true);
                            }}
                        >
                            + Create issue
                        </button>
                    </div>
                ))}
            </div>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? "Edit ticket" : "Create ticket"}
            >
                <form onSubmit={save} className="space-y-4">
                    <input
                        className="input"
                        placeholder="Ticket title"
                        value={form.title}
                        onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                        }
                        required
                    />
                    <textarea
                        className="input"
                        placeholder="Description"
                        value={form.description}
                        onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                        }
                    />
                    <select
                        className="input"
                        value={form.assignee_id}
                        onChange={(e) =>
                            setForm({ ...form, assignee_id: e.target.value })
                        }
                    >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </button>
                        <button className="btn-primary">
                            {editing ? "Save changes" : "Create ticket"}
                        </button>
                    </div>
                </form>
            </Modal>
            <TicketModal
                open={!!detail}
                onClose={() => setDetail(null)}
                ticketId={detail?.id || 0}
            >
                {detail && (
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Left Column - Content */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <input 
                                    className="w-full bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:ring-0 text-2xl font-bold text-gray-900 p-1 -ml-1 transition-colors"
                                    value={detail.title} 
                                    onChange={(e) => {
                                        setDetail({...detail, title: e.target.value});
                                    }}
                                    onBlur={() => {
                                        // Save title on blur
                                        api.put(`/tickets/${detail.id}`, { ...detail, title: detail.title });
                                        load();
                                    }}
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[15px] font-semibold text-gray-800">Description</h3>
                                <textarea
                                    className="w-full min-h-[100px] bg-transparent border border-transparent hover:border-gray-300 focus:border-indigo-500 focus:ring-0 text-[14px] text-gray-700 p-2 rounded transition-colors resize-y"
                                    placeholder="Add a description..."
                                    value={detail.description || ""}
                                    onChange={(e) => setDetail({...detail, description: e.target.value})}
                                    onBlur={() => {
                                        api.put(`/tickets/${detail.id}`, { ...detail, description: detail.description });
                                        load();
                                    }}
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[15px] font-semibold text-gray-800">Attachments</h3>
                                <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                                    <label className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded shadow-sm transition-colors">
                                        Add attachment
                                        <input
                                            className="hidden"
                                            type="file"
                                            onChange={(event) => {
                                                const file = event.target.files?.[0];
                                                if (file) uploadAttachment(detail, file);
                                            }}
                                        />
                                    </label>
                                    {detail.attachment_name && <p className="mt-3 text-[13px] text-blue-400">Attached: {detail.attachment_name}</p>}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-[15px] font-semibold text-[#B6C2CF]">Subtasks</h3>
                                <div className="space-y-2">
                                    {subtasks.map(st => (
                                        <div key={st.id} className="flex items-center gap-3 group">
                                            <input 
                                                type="checkbox" 
                                                checked={st.is_completed}
                                                onChange={(e) => toggleSubtask(st.id, e.target.checked)}
                                                className="w-4 h-4 rounded border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                            />
                                            <span className={`text-[14px] ${st.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                {st.title}
                                            </span>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3 pt-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        <input 
                                            className="w-full bg-transparent border-0 focus:ring-0 text-[14px] text-gray-900 placeholder-gray-400 p-0"
                                            placeholder="Add subtask (press Enter)"
                                            value={newSubtask}
                                            onChange={e => setNewSubtask(e.target.value)}
                                            onKeyDown={handleAddSubtask}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h3 className="text-[15px] font-semibold text-gray-800">Linked work items</h3>
                                <div className="rounded border border-gray-200 bg-gray-50 p-4 text-center text-gray-500 text-[13px]">
                                    No linked work items
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Details */}
                        <div className="w-full md:w-[340px] space-y-6">
                            <select 
                                className="w-auto bg-indigo-50 text-indigo-700 font-medium text-[13px] border border-indigo-200 rounded px-3 py-1.5 cursor-pointer hover:bg-indigo-100 focus:ring-indigo-500"
                                value={detail.status}
                                onChange={(e) => {
                                    api.put(`/tickets/${detail.id}`, { ...detail, status: e.target.value });
                                    setDetail({...detail, status: e.target.value as any});
                                    load();
                                }}
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="in_review">In Review</option>
                                <option value="done">Done</option>
                            </select>

                            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-[14px] font-semibold text-gray-800">Details</h3>
                                    <button className="text-gray-400 hover:text-gray-600">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="flex items-center">
                                        <span className="w-[120px] text-[13px] font-medium text-gray-500">Assignee</span>
                                        <div className="relative inline-flex items-center gap-2 hover:bg-gray-50 border border-transparent hover:border-gray-200 p-1 -ml-1 rounded cursor-pointer transition-colors">
                                            <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white">
                                                {detail.assignee?.name ? detail.assignee.name.substring(0,2).toUpperCase() : '?'}
                                            </div>
                                            <span className="text-[13px] font-medium text-gray-800">{detail.assignee?.name || 'Unassigned'}</span>
                                            <select 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                value={detail.assignee?.id || ""}
                                                onChange={(e) => {
                                                    const user = users.find(u => u.id === Number(e.target.value));
                                                    setDetail({...detail, assignee: user ? {id: user.id, name: user.name} : undefined});
                                                    api.put(`/tickets/${detail.id}`, { ...detail, assignee_id: e.target.value });
                                                    load();
                                                }}
                                            >
                                                <option value="">Unassigned</option>
                                                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[120px] text-[13px] font-medium text-gray-500">Priority</span>
                                        <div className="relative inline-flex items-center gap-2 hover:bg-gray-50 border border-transparent hover:border-gray-200 p-1 -ml-1 rounded cursor-pointer transition-colors">
                                            {getPriorityIcon(detail.priority)}
                                            <span className="text-[13px] font-medium text-gray-800 capitalize">{detail.priority || 'Medium'}</span>
                                            <select 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                value={detail.priority || "medium"}
                                                onChange={(e) => {
                                                    setDetail({...detail, priority: e.target.value as any});
                                                    api.put(`/tickets/${detail.id}`, { ...detail, priority: e.target.value });
                                                    load();
                                                }}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[120px] text-[13px] font-medium text-gray-500">Labels</span>
                                        <span className="text-[13px] text-gray-800">None</span>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="w-[120px] text-[13px] font-medium text-gray-500">Due date</span>
                                        <span className="text-[13px] text-gray-800">{detail.due_date?.slice(0, 10) || "None"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </TicketModal>
        </div>
    );
}
