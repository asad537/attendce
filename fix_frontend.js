const fs = require('fs');

const originalStr = `          <div className="flex items-center gap-3">
            <input type="checkbox" id="half_day" checked={form.is_half_day}
              onChange={(e) => setForm(f => ({ ...f, is_half_day: e.target.checked }))} className="rounded" />
            <label htmlFor="half_day" className="text-sm text-gray-700">Half day</label>
            {form.is_half_day && (
              <select className="input text-sm ml-2" value={form.half_day_period}
                onChange={(e) => setForm(f => ({ ...f, half_day_period: e.target.value }))}>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            )}
          </div>`;

const replacementStr = `          <div>
            <label className="label text-sm font-medium text-gray-700">Leave Duration</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="duration" checked={!form.is_half_day}
                  onChange={() => setForm(f => ({ ...f, is_half_day: false }))} className="text-indigo-600 focus:ring-indigo-500" />
                Full Day
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="duration" checked={form.is_half_day}
                  onChange={() => setForm(f => ({ ...f, is_half_day: true }))} className="text-indigo-600 focus:ring-indigo-500" />
                Half Day
              </label>
            </div>
            {form.is_half_day && (
              <div className="mt-3">
                <select className="input text-sm" value={form.half_day_period}
                  onChange={(e) => setForm(f => ({ ...f, half_day_period: e.target.value }))}>
                  <option value="morning">Morning (First Half)</option>
                  <option value="afternoon">Afternoon (Second Half)</option>
                </select>
              </div>
            )}
          </div>`;

function replaceInFile(path) {
  if (!fs.existsSync(path)) return;
  let content = fs.readFileSync(path, 'utf8');
  if (content.includes('id="half_day"')) {
    content = content.replace(originalStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed', path);
  } else {
    console.log('Not found in', path);
  }
}

const paths = [
  '/Users/rumaiharana/Documents/React-js/attendance-system/src/pages/employee/LeaveManagement.tsx',
  '/Users/rumaiharana/Documents/React-js/attendance-api/frontend/src/pages/employee/LeaveManagement.tsx'
];

paths.forEach(replaceInFile);

