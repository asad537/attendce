const fs = require('fs');

function processFrontend(baseDir) {
  const path = baseDir + '/src/pages/ceo/CeoHolidays.tsx';
  if (!fs.existsSync(path)) return;
  
  let content = fs.readFileSync(path, 'utf8');

  // Change title state to name
  content = content.replace("const [title, setTitle] = useState('');", "const [name, setName] = useState('');");
  
  // Fix openModal
  content = content.replace("setTitle(holiday.title);", "setName(holiday.name);");
  content = content.replace("setTitle('');", "setName('');");

  // Fix handleSubmit payload
  content = content.replace("const payload = { title, date, type, description };", "const payload = { name, date, type, description };");

  // Fix form input
  content = content.replace(
    'value={title} onChange={e => setTitle(e.target.value)}', 
    'value={name} onChange={e => setName(e.target.value)}'
  );

  // Fix table display
  content = content.replace("{holiday.title}", "{holiday.name}");

  // Fix select options
  content = content.replace(
    '<option value="company">Company</option>',
    '<option value="restricted">Company (Restricted)</option>\n                  <option value="optional">Optional</option>'
  );

  fs.writeFileSync(path, content, 'utf8');
  console.log("Updated", path);
}

processFrontend('/Users/rumaiharana/Documents/React-js/attendance-system');
processFrontend('/Users/rumaiharana/Documents/React-js/attendance-api/frontend');
