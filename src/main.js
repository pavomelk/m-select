import './m-select.css';
import MSelectFacade from './m-select-facade.js';
import { inputExample } from '../project/input.example.js';

const app = document.getElementById('app');

const heading = document.createElement('h1');
heading.textContent = 'm-select — basic visual prototype';

const intro = document.createElement('p');
intro.textContent =
  'Selection Box always visible. Click items in the Drop Down to toggle; ' +
  'click chip "x" to remove, filter to narrow, "Select All" tops the list, ' +
  'maxVisibleChips = 4 collapses chips into a summary. Submit to see the values ' +
  'the enclosing form would send.';

const host = document.createElement('div');
host.id = 'mselect-host';
host.style.margin = '24px 0';

const form = document.createElement('form');
form.id = 'mselect-form';

const submit = document.createElement('button');
submit.type = 'submit';
submit.textContent = 'Submit';
submit.style.marginTop = '12px';

const submitted = document.createElement('pre');
submitted.textContent = 'submitted: (nothing yet)';

const state = document.createElement('pre');
state.textContent = 'selected values: []';

const neighbor = document.createElement('div');
neighbor.style.margin = '12px 0';
const neighborLabel = document.createElement('label');
neighborLabel.textContent = 'Focus target next to the control: ';
const neighborInput = document.createElement('input');
neighborInput.type = 'text';
neighborInput.placeholder = 'Tab or click here to leave the control';
neighbor.append(neighborLabel, neighborInput);

form.append(host, submit);
app.append(heading, intro, form);

const control = new MSelectFacade(host, inputExample);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const payload = new URLSearchParams(new FormData(form)).toString();
  submitted.textContent = 'submitted: ' + (payload || '(no values)');
});

const reflect = () => {
  state.textContent =
    'selected values: ' +
    JSON.stringify(control.values) +
    '   mode: ' +
    control.mode;
};
control.on('cm-selection-change', reflect);
control.on('cm-mode-change', reflect);
reflect();

app.append(state, neighbor, submitted);
window.control = control;


