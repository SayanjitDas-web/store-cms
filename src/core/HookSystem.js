class HookSystem {
    constructor() {
        this.hooks = {
            actions: {},
            filters: {}
        };
    }

    addAction(hookName, callback, priority = 10) {
        if (!this.hooks.actions[hookName]) {
            this.hooks.actions[hookName] = [];
        }
        this.hooks.actions[hookName].push({ callback, priority });
        this.hooks.actions[hookName].sort((a, b) => a.priority - b.priority);
    }

    addFilter(hookName, callback, priority = 10) {
        if (!this.hooks.filters[hookName]) {
            this.hooks.filters[hookName] = [];
        }
        this.hooks.filters[hookName].push({ callback, priority });
        this.hooks.filters[hookName].sort((a, b) => a.priority - b.priority);
    }

    async doAction(hookName, ...args) {
        if (this.hooks.actions[hookName]) {
            for (const hook of this.hooks.actions[hookName]) {
                await hook.callback(...args);
            }
        }
    }

    async applyFilter(hookName, content, ...args) {
        if (this.hooks.filters[hookName]) {
            for (const hook of this.hooks.filters[hookName]) {
                content = await hook.callback(content, ...args);
            }
        }
        return content;
    }
}

module.exports = new HookSystem();
