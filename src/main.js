import './m-select.css';
import MSelect from './m-select.js';
import { inputExample } from '../project/input.example.js';

const app = document.getElementById('app');

const heading = document.createElement('h1');
heading.textContent = 'm-select — basic visual prototype';

const intro = document.createElement('p');
intro.textContent =
  'Selection Box always visible. Click items in the Drop Down to toggle; ' +
  'click chip "x" to remove, filter to narrow, "Select All" tops the list, ' +
  'maxVisibleChips = 4 collapses chips into a summary.';

const host = document.createElement('div');
host.id = 'mselect-host';
host.style.margin = '24px 0';

const state = document.createElement('pre');
state.textContent = 'selected values: []';

app.append(heading, intro, host);

const control = new MSelect(host, inputExample);

const reflect = () => {
  state.textContent = 'selected values: ' + JSON.stringify(control.selectedItems.map((i) => i.value));
};
const timer = setInterval(reflect, 100);
window.addEventListener('beforeunload', () => clearInterval(timer));
reflect();

app.append(state);
window.control = control;


