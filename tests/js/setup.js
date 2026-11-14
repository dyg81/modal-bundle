// Minimal Bootstrap 5 Modal mock. jsdom cannot run Bootstrap's layout code,
// so tests provide getOrCreateInstance() and drive the lifecycle events.
const instances = new WeakMap();

function createInstance(element) {
    return {
        show() {
            element.classList.add('show');
            element.style.display = 'block';
            element.dispatchEvent(new Event('shown.bs.modal'));
        },
        hide() {
            element.classList.remove('show');
            element.style.display = 'none';
            element.dispatchEvent(new Event('hidden.bs.modal'));
        }
    };
}

global.bootstrap = {
    Modal: {
        getOrCreateInstance(element) {
            if (!instances.has(element)) {
                instances.set(element, createInstance(element));
            }

            return instances.get(element);
        }
    }
};

window.bootstrap = global.bootstrap;
