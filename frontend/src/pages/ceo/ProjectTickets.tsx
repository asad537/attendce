import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../services/api';
import { userService } from '../../services/userService';
import { useAuth } from '../../contexts/AuthContext';
import { projectService } from '../../services/projectService';
import Modal from '../../components/common/Modal';
import { User } from '../../types';

type Ticket = { id:number; title:string; description?:string; status:'todo'|'in_progress'|'in_review'|'done'; priority?:'low'|'medium'|'high'|'urgent'; assignee?: { id:number, name:string } };
const cols = [{key:'todo',name:'To Do'},{key:'in_progress',name:'In Progress'},{key:'in_review',name:'In Review'},{key:'done',name:'Done'}] as const;

export default function ProjectTickets() {
 const { user: currentUser } = useAuth(); const { projectId }=useParams(); const [tickets,setTickets]=useState<Ticket[]>([]); const [users,setUsers]=useState<User[]>([]); const [projectName,setProjectName]=useState('Project'); const [open,setOpen]=useState(false); const [editing,setEditing]=useState<Ticket|null>(null); const [form,setForm]=useState({title:'',description:'',status:'todo',priority:'medium',assignee_id:''});
 const load=async()=>{try{const [t,u,p]=await Promise.all([api.get(`/projects/${projectId}/tickets`),userService.getList({per_page:200}),projectService.getAll()]);setTickets(t.data.tickets);setUsers(u.data.filter(user => currentUser?.role === 'ceo' ? ['manager', 'tl'].includes(user.role) : ['tl', 'employee'].includes(user.role)));setProjectName(p.find(project=>project.id===Number(projectId))?.name||'Project');}catch(e){toast.error(getErrorMessage(e));}};
 useEffect(()=>{load();},[projectId]);
 
 const save=async(e:React.FormEvent)=>{e.preventDefault();try{if(editing) await api.put(`/tickets/${editing.id}`,{...form,assignee_id:form.assignee_id||null}); else await api.post(`/projects/${projectId}/tickets`,{...form,assignee_id:form.assignee_id||null});setOpen(false);setEditing(null);setForm({title:'',description:'',status:'todo',priority:'medium',assignee_id:''});load();toast.success('Ticket saved.');}catch(err){toast.error(getErrorMessage(err));}};
 
 const updatePriority = async (ticket: Ticket, newPriority: string) => {
   try {
     await api.put(`/tickets/${ticket.id}`, { title: ticket.title, description: ticket.description, status: ticket.status, priority: newPriority, assignee_id: ticket.assignee?.id || null });
     load();
     toast.success('Priority updated');
   } catch(err) {
     toast.error('Failed to update priority');
   }
 };

 const getPriorityIcon = (p?: string) => {
   if (p === 'high' || p === 'urgent') return <span className="text-red-500 font-bold text-lg leading-none cursor-pointer pt-1">↑</span>;
   if (p === 'low') return <span className="text-blue-500 font-bold text-lg leading-none cursor-pointer pt-1">↓</span>;
   return <span className="text-orange-500 font-bold text-lg leading-none cursor-pointer pt-1">=</span>; // medium/default
 };

 return <div className="space-y-5"><div className="card flex items-center justify-between"><div><p className="text-xs font-semibold text-indigo-600">PROJECT WORKSPACE</p><h1 className="text-2xl font-bold">{projectName}</h1><p className="text-sm text-gray-500">Tickets Board · Create tickets and assign them to your team.</p></div><button className="btn-primary" onClick={()=>{setEditing(null);setForm({title:'',description:'',status:'todo',priority:'medium',assignee_id:''});setOpen(true)}}>+ Create ticket</button></div>
 <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">{cols.map(c=><div key={c.key} className="min-h-72 rounded-xl bg-gray-100/50 p-3"><div className="mb-3 flex justify-between font-semibold text-gray-700"><span>{c.name} <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{tickets.filter(t=>t.status===c.key).length}</span></span></div>
 {tickets.filter(t=>t.status===c.key).map(t=><div key={t.id} className="mb-3 rounded-lg bg-[#22272B] p-3 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all cursor-pointer">
   <div className="flex justify-between items-start mb-4">
     <p className="font-medium text-[14px] leading-5 text-[#B6C2CF] pr-2">{t.title}</p>
     <div className="flex gap-1 text-[#8C9BAB] shrink-0">
       <button onClick={(e) => { e.stopPropagation(); setEditing(t); setForm({title:t.title, description:t.description||'', status:t.status, priority:t.priority||'medium', assignee_id:t.assignee?.id?.toString()||''}); setOpen(true); }} className="hover:bg-[#323940] p-1 rounded transition-colors">
         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
       </button>
       <button className="hover:bg-[#323940] p-1 rounded transition-colors" onClick={(e)=>e.stopPropagation()}>
         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
       </button>
     </div>
   </div>
   <div className="flex items-center justify-between">
     <div className="flex items-center gap-2">
       <input type="checkbox" className="w-4 h-4 rounded border-[#323940] bg-transparent text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer" onClick={(e)=>e.stopPropagation()} />
       <span className="text-[12px] font-semibold text-[#8C9BAB] hover:text-blue-400 transition-colors">KAN-{t.id}</span>
     </div>
     <div className="flex items-center gap-2.5">
        <div className="relative inline-flex items-center justify-center w-6 h-6 hover:bg-[#323940] rounded transition-colors" title={`Priority: ${t.priority || 'medium'}`} onClick={(e)=>e.stopPropagation()}>
          <select className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" value={t.priority || 'medium'} onChange={(e) => updatePriority(t, e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {getPriorityIcon(t.priority)}
        </div>
        <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-[#22272B]" title={t.assignee?.name || 'Unassigned'}>
          {t.assignee?.name ? t.assignee.name.substring(0, 2).toUpperCase() : '?'}
        </div>
     </div>
   </div>
 </div>)}
 <button className="w-full rounded-lg hover:bg-gray-200 py-2 text-sm font-medium text-gray-600 transition-colors" onClick={()=>{setEditing(null);setForm({title:'',description:'',status:c.key,priority:'medium',assignee_id:''});setOpen(true)}}>+ Create issue</button></div>)}</div>
 <Modal open={open} onClose={()=>setOpen(false)} title={editing ? "Edit ticket" : "Create ticket"}><form onSubmit={save} className="space-y-4"><input className="input" placeholder="Ticket title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/><textarea className="input" placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><select className="input" value={form.assignee_id} onChange={e=>setForm({...form,assignee_id:e.target.value})}><option value="">Unassigned</option>{users.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={()=>setOpen(false)}>Cancel</button><button className="btn-primary">{editing ? "Save changes" : "Create ticket"}</button></div></form></Modal></div>;
}
