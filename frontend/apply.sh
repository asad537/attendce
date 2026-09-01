node -e "
const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'src/pages/shared/InboxPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. States
content = content.replace(
  'const [replyingTo, setReplyingTo] = useState<InboxMessage | null>(null);',
  \`const [replyingTo, setReplyingTo] = useState<InboxMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<InboxMessage | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<InboxMessage | null>(null);\`
);

// 2. Mutations
content = content.replace(
  \`parent_id: replyingTo?.id,
    }),
    onMutate: async () => {\`,
  \`parent_id: replyingTo?.id,
      is_forwarded: !!forwardingMessage,
    }),
    onMutate: async () => {\`
);
content = content.replace(
  \`setMessage('');
      setPendingFile(null);
      setReplyingTo(null);
      invalidate();
    },
  });\`,
  \`setMessage('');
      setPendingFile(null);
      setReplyingTo(null);
      setEditingMessage(null);
      setForwardingMessage(null);
      invalidate();
    },
  });

  const editMessage = useMutation({
    mutationFn: () => messageService.edit(editingMessage!.id, message),
    onSuccess: () => {
      setMessage('');
      setEditingMessage(null);
      setReplyingTo(null);
      invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const reactMessage = useMutation({
    mutationFn: ({ id, reaction }: { id: number; reaction: string | null }) =>
      messageService.react(id, reaction),
    onSuccess: () => invalidate(),
    onError: (error) => toast.error(getErrorMessage(error)),
  });\`
);

// 3. submit
content = content.replace(
  \`const submit = () => {
    if (
      (message.trim() || pendingFile) &&
      selectedUserId &&
      !send.isPending
    ) {
      send.mutate();
    }
  };\`,
  \`const submit = () => {
    if (editingMessage) {
      if (message.trim() && !editMessage.isPending) editMessage.mutate();
    } else {
      if (
        (message.trim() || pendingFile) &&
        selectedUserId &&
        !send.isPending
      ) {
        send.mutate();
      }
    }
  };\`
);

// 4. chooseConversation
content = content.replace(
  \`setReplyingTo(null);
    setShowSearch(false);
    setMsgSearch('');
    setShowChatMenu(false);
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  };\`,
  \`setReplyingTo(null);
    setEditingMessage(null);
    setShowSearch(false);
    setMsgSearch('');
    setShowChatMenu(false);
    if (forwardingMessage) setMessage(forwardingMessage.body);
    queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
  };\`
);

// 5. Message rendering inside mapped array
content = content.replace(
  /{item\.is_deleted \? \([\\s\\S]*?\) : \([\\s\\S]*?<>\s*/s,
  (match) => match + \`{item.is_forwarded && (
                          <div className=\"mb-1 flex items-center gap-1 text-[10px] italic opacity-60\">
                            <svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" strokeWidth=\"2\" className=\"h-3 w-3\">
                              <path d=\"M19 11l-6-6v4C6 9 3 14 3 20c2-3.5 5-5 10-5v4l6-6z\" />
                            </svg>{' '}
                            Forwarded
                          </div>
                        )}
                        {item.parent && (
                          <div className={\\\\\`mb-1.5 rounded bg-black/10 px-2.5 py-1.5 text-xs \\\${mine ? 'text-white/80' : 'text-slate-600'}\\\\\`}>
                            <div className=\"mb-0.5 font-bold\">{item.parent.sender.id === me?.id ? 'You' : item.parent.sender.name}</div>
                            <div className=\"line-clamp-2 truncate\">{item.parent.body}</div>
                          </div>
                        )}\`
);

// Reactions closing tags
content = content.replace(
  /\{item\.body && \(\s*<p\s*className=\{\`whitespace-pre-wrap break-words px-0\.5 text-\[13px\] leading-5 \$\{\s*mine \? 'text-white' : 'text-slate-800'\s*\}\`\}\s*>\s*\{item\.body\}\s*<\/p>\s*\)\s*\}\s*<\/>\s*\)/s,
  (match) => match + \`
                    {item.reactions && Object.keys(item.reactions).length > 0 && (
                      <div className={\\\\\`absolute -bottom-3 \\\${mine ? 'right-4' : 'left-4'} z-10 flex gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] shadow-sm\\\\\`}>
                        {Array.from(new Set(Object.values(item.reactions))).map((emoji) => (
                          <span key={emoji as string}>{emoji as string}</span>
                        ))}
                        {Object.keys(item.reactions).length > 1 && (
                          <span className=\"ml-0.5 text-[9px] font-bold text-slate-500\">{Object.keys(item.reactions).length}</span>
                        )}
                      </div>
                    )}\`
);

// Timestamp logic
content = content.replace(
  /\{format\(new Date\(item\.created_at\), 'hh:mm a'\)\}\s*\{mine && !item\.is_deleted && \(\s*<DoubleCheck className=\"ml-0\.5 h-\[13px\] w-\[15px\] text-emerald-200\" \/>\s*\)\}/s,
  \`{format(new Date(item.created_at), 'hh:mm a')}
                    {item.is_edited && <span className=\"italic\">(edited)</span>}
                    {mine && !item.is_deleted && (
                      <DoubleCheck className=\"ml-0.5 h-[13px] w-[15px] text-emerald-200\" />
                    )}\`
);

// Dropdown arrow
content = content.replace(
  /className=\{\`absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full text-slate-500 shadow-sm backdrop-blur-sm \$\{\s*att\?\.is_image\s*\?\s*'bg-white\/85'\s*:\s*mine\s*\?\s*'bg-emerald-700\/80 text-white'\s*:\s*'bg-slate-100'\s*\}\s*\$\{\s*menuFor === item\.id \? 'grid' : 'hidden group-hover:grid'\s*\}\`\}/s,
  \`className={\\\\\`absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded-full shadow-sm backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 \\\${menuFor === item.id ? 'opacity-100' : ''} \\\${
                        att?.is_image ? 'bg-white/85 text-slate-500' : mine ? 'bg-emerald-700/80 text-white' : 'bg-slate-200/80 text-slate-600'
                      }\\\\\`}\`
);

// Menu dropdown options
content = content.replace(
  /className=\{\`absolute top-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left text-\[13px\] shadow-xl \$\{\s*mine \? 'right-full mr-2' : 'left-full ml-2'\s*\}\`\}\s*>/s,
  (match) => match.replace('overflow-hidden', 'overflow-visible') + \`
                        <div className=\"mb-1 flex justify-between border-b border-slate-100 px-2 py-1.5\">
                          {['👍', '❤️', '😂', '😮', '😢'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => { reactMessage.mutate({ id: item.id, reaction: item.reactions?.[me?.id || 0] === emoji ? null : emoji }); setMenuFor(null); }}
                              className={\\\\\`rounded p-1 text-base transition-transform hover:scale-110 \\\${item.reactions?.[me?.id || 0] === emoji ? 'bg-slate-200' : 'hover:bg-slate-100'}\\\\\`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>\`
);

content = content.replace(
  /<button\s*onClick=\{.*\s*disabled=\{remove\.isPending\}\s*className=\"block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50\"\s*>\s*Delete for me\s*<\/button>/s,
  (match) => \`<button
                          onClick={() => { setReplyingTo(item); setEditingMessage(null); setMenuFor(null); }}
                          className=\"flex w-full items-center gap-2 block px-3 py-2 text-left text-slate-700 hover:bg-slate-50\"
                        >
                          Reply
                        </button>
                        <button
                          onClick={() => { setForwardingMessage(item); setReplyingTo(null); setEditingMessage(null); setMenuFor(null); setShowPeople(true); }}
                          className=\"flex w-full items-center gap-2 block px-3 py-2 text-left text-slate-700 hover:bg-slate-50\"
                        >
                          <svg className=\"h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\" stroke=\"currentColor\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M19 11l-6-6v4C6 9 3 14 3 20c2-3.5 5-5 10-5v4l6-6z\" /></svg>{' '}
                          Forward
                        </button>
                        {mine && !att && (
                          <button
                            onClick={() => { setEditingMessage(item); setMessage(item.body); setReplyingTo(null); setMenuFor(null); }}
                            className=\"block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50\"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => { navigator.clipboard.writeText(item.body); toast.success('Copied to clipboard'); setMenuFor(null); }}
                          className=\"block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50\"
                        >
                          Copy
                        </button>
                        \` + match
);

// Footer bar
content = content.replace(
  /<footer className=\"shrink-0 bg-\\[#f0f2f5\\] px-3 py-2\">/s,
  \`<footer className=\"flex flex-col shrink-0 bg-[#f0f2f5] px-3 py-2\">
            {(replyingTo || editingMessage || forwardingMessage) && (
              <div className=\"mb-2 flex items-center gap-3 rounded-xl border border-emerald-100 bg-white px-4 py-2 text-sm shadow-sm\">
                <div className=\"min-w-0 flex-1 border-l-4 border-emerald-500 pl-3\">
                  <div className=\"mb-0.5 text-xs font-bold text-emerald-700\">
                    {editingMessage
                      ? 'Editing Message'
                      : forwardingMessage
                        ? 'Forwarding Message'
                        : \\\\\`Replying to \\\${replyingTo!.sender.id === me?.id ? 'Yourself' : replyingTo!.sender.name}\\\\\`}
                  </div>
                  <div className=\"truncate text-xs text-slate-600\">
                    {editingMessage ? editingMessage.body : forwardingMessage ? forwardingMessage.body : replyingTo!.body}
                  </div>
                </div>
                <button
                  onClick={() => { setReplyingTo(null); setEditingMessage(null); setForwardingMessage(null); setMessage(''); }}
                  className=\"grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600\"
                >✕</button>
              </div>
            )}\`
);

content = content.replace(
  /disabled=\{\s*\(!message\.trim\(\) && !pendingFile\) \|\| send\.isPending\s*\}/s,
  \`disabled={(!message.trim() && !pendingFile) || (editingMessage ? editMessage.isPending : send.isPending)}\`
);

fs.writeFileSync(filePath, content);
"
npx prettier --write src/pages/shared/InboxPage.tsx
npx eslint src/pages/shared/InboxPage.tsx
