/**
 * StoreCMS Page Builder Core Logic
 */

// Initialize Registry safely (allows other plugins to register blocks before this script loads)
window.BlockRegistry = window.BlockRegistry || {
    blocks: {},
    register(id, config) {
        this.blocks[id] = config;
    },
    get(id) {
        return this.blocks[id];
    }
};
const BlockRegistry = window.BlockRegistry;


// --- Standard Blocks ---

BlockRegistry.register('hero', {
    name: 'Hero Section',
    icon: 'bi-window-fullscreen',
    defaultData: {
        title: 'Welcome to Our Store',
        subtitle: 'The best products at unbeatable prices.',
        buttonText: 'Shop Now',
        buttonUrl: '#',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200',
        align: 'center', // left, center, right
        opacity: 40,
        textColor: 'white'
    },
    render(data) {
        const align = data.align || 'center';
        const alignClass = align === 'center' ? 'mx-auto' : (align === 'right' ? 'ml-auto' : '');
        const textAlign = `text-${align}`;
        const opacityValue = (data.opacity !== undefined ? data.opacity : 40);
        const opacity = opacityValue / 100;
        const textColor = data.textColor || 'white';

        return `
            <section class="relative bg-gray-900 text-${textColor} py-24 px-12 overflow-hidden block-element" data-type="hero">
                <div class="absolute inset-0" style="opacity: ${opacity}">
                    <img src="${data.image}" class="w-full h-full object-cover">
                </div>
                <div class="relative z-10 max-w-2xl ${alignClass} ${textAlign}">
                    <h1 class="text-5xl font-extrabold mb-6 transition-all" contenteditable="true" data-prop="title">${data.title}</h1>
                    <p class="text-xl mb-8 opacity-90 transition-all font-light" contenteditable="true" data-prop="subtitle">${data.subtitle}</p>
                    <a href="${data.buttonUrl || '#'}" class="inline-block bg-indigo-600 px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition-colors" data-prop="buttonText" contenteditable="true">${data.buttonText}</a>
                </div>
            </section>
        `;
    },
    getSettings(data) {
        const align = data.align || 'center';
        const textColor = data.textColor || 'white';
        const opacity = (data.opacity !== undefined ? data.opacity : 40);
        const buttonUrl = data.buttonUrl || '#';

        return `
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Background Image</label>
                    <div class="flex space-x-2">
                        <input type="text" class="flex-1 border p-2 rounded text-sm" data-prop="image" id="heroImageUrl" value="${data.image}">
                        <button onclick="openHeroPicker()" class="bg-gray-100 p-2 rounded border hover:bg-gray-200">
                            <i class="bi bi-image"></i>
                        </button>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Text Align</label>
                        <select class="w-full border p-2 rounded text-sm" data-prop="align">
                            <option value="left" ${align === 'left' ? 'selected' : ''}>Left</option>
                            <option value="center" ${align === 'center' ? 'selected' : ''}>Center</option>
                            <option value="right" ${align === 'right' ? 'selected' : ''}>Right</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Text Color</label>
                        <select class="w-full border p-2 rounded text-sm" data-prop="textColor">
                            <option value="white" ${textColor === 'white' ? 'selected' : ''}>White</option>
                            <option value="gray-900" ${textColor === 'gray-900' ? 'selected' : ''}>Dark</option>
                            <option value="indigo-200" ${textColor === 'indigo-200' ? 'selected' : ''}>Lavender</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Overlay Opacity (${opacity}%)</label>
                    <input type="range" class="w-full" data-prop="opacity" min="0" max="100" value="${opacity}">
                </div>
                <div class="grid grid-cols-1 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Link to Page</label>
                        <select class="w-full border p-2 rounded text-sm" onchange="document.getElementById('heroButtonUrl').value = this.value; document.getElementById('heroButtonUrl').dispatchEvent(new Event('input', { bubbles: true }));">
                            <option value="">-- Select a Page --</option>
                            <option value="/">Home</option>
                            <option value="/shop">Shop</option>
                            <option value="/cart">Cart</option>
                            ${(state.pageLinks || []).map(p => `<option value="/${p.slug}" ${buttonUrl === '/' + p.slug ? 'selected' : ''}>${p.title}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Manual Button URL</label>
                        <input type="text" class="w-full border p-2 rounded text-sm" data-prop="buttonUrl" id="heroButtonUrl" value="${buttonUrl}">
                    </div>
                </div>
            </div>
        `;
    }
});

BlockRegistry.register('text', {
    name: 'Text Module',
    icon: 'bi-justify-left',
    defaultData: {
        content: 'This is a text module. You can edit this directly on the canvas or via settings.'
    },
    render(data) {
        return `
            <div class="py-12 px-12 bg-white block-element" data-type="text">
                <div class="prose max-w-none transition-all" contenteditable="true" data-prop="content">${data.content}</div>
            </div>
        `;
    }
});

BlockRegistry.register('image', {
    name: 'Single Image',
    icon: 'bi-image',
    defaultData: {
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800',
        caption: 'Product Image Detail'
    },
    render(data) {
        return `
            <div class="py-12 px-12 bg-gray-50 flex flex-col items-center block-element" data-type="image">
                <img src="${data.url}" class="rounded-xl shadow-lg max-w-full h-auto mb-4" data-prop="url">
                <p class="text-gray-500 text-sm italic" contenteditable="true" data-prop="caption">${data.caption}</p>
            </div>
        `;
    },
    getSettings(data) {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                <div class="flex space-x-2">
                    <input type="text" class="flex-1 border p-2 rounded text-sm" data-prop="url" id="imageBlockUrl" value="${data.url}">
                    <button onclick="openImageBlockPicker()" class="bg-gray-100 p-2 rounded border hover:bg-gray-200">
                        <i class="bi bi-image"></i>
                    </button>
                </div>
            </div>
        `;
    }
});

BlockRegistry.register('feature-list', {
    name: 'Feature List',
    icon: 'bi-check2-circle',
    defaultData: {
        features: 'Fast Shipping,Secure Payments,24/7 Support,Premium Quality'
    },
    render(data) {
        const items = data.features.split(',').map(f => `
            <div class="flex items-center space-x-3">
                <div class="flex-shrink-0 w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <i class="bi bi-check text-xs"></i>
                </div>
                <span class="text-gray-700">${f.trim()}</span>
            </div>
        `).join('');
        return `
            <div class="py-12 px-12 bg-white block-element" data-type="feature-list">
                <div class="grid grid-cols-2 gap-6" data-prop="features">${items}</div>
            </div>
        `;
    },
    getSettings(data) {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Features (Comma separated)</label>
                <textarea class="w-full border p-2 rounded text-sm" data-prop="features">${data.features}</textarea>
            </div>
        `;
    }
});

BlockRegistry.register('product-grid', {
    name: 'Product Showcase',
    icon: 'bi-grid-3x3-gap',
    defaultData: {
        title: 'Featured Products',
        limit: 4
    },
    render(data) {
        let items = '';
        for (let i = 1; i <= data.limit; i++) {
            items += `
                <div class="bg-white border rounded-lg p-4 shadow-sm">
                    <div class="aspect-square bg-gray-100 rounded mb-4 flex items-center justify-center text-gray-400">
                        <i class="bi bi-image text-2xl"></i>
                    </div>
                    <div class="h-4 bg-gray-100 rounded w-3/4 mb-2"></div>
                    <div class="h-4 bg-gray-100 rounded w-1/2"></div>
                </div>
            `;
        }
        return `
            <div class="py-12 px-12 bg-white block-element" data-type="product-grid">
                <h2 class="text-3xl font-bold mb-8 text-center" contenteditable="true" data-prop="title">${data.title}</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">${items}</div>
                <div class="mt-8 text-center text-xs text-gray-400 italic">(Real products will be shown on the live site)</div>
            </div>
        `;
    },
    getSettings(data) {
        return `
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Max Products</label>
                <input type="number" class="w-full border p-2 rounded text-sm" data-prop="limit" value="${data.limit}">
            </div>
        `;
    }
});

// --- Builder State & DOM ---

let state = {
    blocks: [],
    selectedId: null,
    pageLinks: []
};

const canvas = document.getElementById('canvas');
const palette = document.getElementById('blockPalette');
const settings = document.getElementById('settingsPanel');
const settingsContent = document.getElementById('settingsContent');
const dropZone = document.getElementById('dropZone');

// --- Initialization ---

function init() {
    // Load initial data
    const raw = document.getElementById('initialBlocks').textContent;
    state.blocks = JSON.parse(raw);

    renderPalette();
    renderCanvas();

    // Load available pages for links
    const pagesRaw = document.getElementById('availablePages').textContent;
    state.pageLinks = JSON.parse(pagesRaw);

    document.getElementById('saveBtn').addEventListener('click', savePage);


}


function renderPalette() {
    Object.keys(BlockRegistry.blocks).forEach(id => {
        const block = BlockRegistry.blocks[id];
        const div = document.createElement('div');
        div.className = `bg-gray-50 p-4 border border-gray-200 rounded-lg cursor-move hover:border-indigo-400 hover:shadow-sm transition-all text-center relative group ${block.pro ? 'opacity-70' : ''}`;
        div.draggable = !block.pro;

        div.innerHTML = `
            ${block.pro ? '<span class="absolute top-1 right-1 bg-yellow-400 text-[8px] font-bold px-1 rounded text-white shadow-sm">PRO</span>' : ''}
            <i class="bi ${block.icon} text-xl text-gray-400 mb-1 block group-hover:text-indigo-500 transition-colors"></i>
            <span class="text-[10px] font-bold uppercase text-gray-500">${block.name}</span>
        `;

        if (block.pro) {
            div.onclick = () => alert('This is a Premium Block. Upgrade to StoreCMS Pro to unlock!');
        } else {
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('blockType', id);
            });
        }
        palette.appendChild(div);
    });
}

function renderCanvas() {
    // If no blocks, show dropzone help
    if (state.blocks.length === 0) {
        dropZone.style.display = 'flex';
    } else {
        dropZone.style.display = 'none';

        // Use a temporary fragment for performance
        const fragment = document.createDocumentFragment();

        state.blocks.forEach((b, index) => {
            const registry = BlockRegistry.get(b.type);
            if (!registry) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'relative group';
            wrapper.dataset.index = index;

            // Render the actual block content
            wrapper.innerHTML = registry.render(b.data);

            // Add Control Overlay
            const overlay = document.createElement('div');
            overlay.className = 'absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-20';
            overlay.innerHTML = `
                <button class="bg-white p-1.5 rounded shadow-md text-gray-500 hover:text-indigo-600" onclick="moveBlock(${index}, -1)"><i class="bi bi-chevron-up"></i></button>
                <button class="bg-white p-1.5 rounded shadow-md text-gray-500 hover:text-indigo-600" onclick="moveBlock(${index}, 1)"><i class="bi bi-chevron-down"></i></button>
                <button class="bg-white p-1.5 rounded shadow-md text-gray-500 hover:text-red-600" onclick="removeBlock(${index})"><i class="bi bi-trash"></i></button>
            `;
            wrapper.appendChild(overlay);

            // Handle Selection
            wrapper.addEventListener('click', () => selectBlock(index));

            // Handle Content Changes (Debounced ideally)
            wrapper.querySelectorAll('[contenteditable]').forEach(el => {
                el.addEventListener('blur', (e) => {
                    const prop = e.target.dataset.prop;
                    state.blocks[index].data[prop] = e.target.innerHTML;
                });
            });

            fragment.appendChild(wrapper);
        });

        // Clear canvas and insert new frag (retaining dropzone outside)
        const oldBlocks = canvas.querySelectorAll('.group');
        oldBlocks.forEach(b => b.remove());
        canvas.insertBefore(fragment, dropZone);

        // PERSISTENCE FIX: Re-apply selection class after re-render
        if (state.selectedId !== null) {
            const blocks = canvas.querySelectorAll('.group');
            if (blocks[state.selectedId]) {
                blocks[state.selectedId].classList.add('block-selected');
            }
        }
    }
}


// --- Interactions ---

canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('blockType');
    if (!type) return;

    const registry = BlockRegistry.get(type);
    state.blocks.push({
        type: type,
        data: { ...registry.defaultData }
    });
    renderCanvas();
});

// INTERCEPTION FIX: Prevent links/buttons from redirecting while in the editor
canvas.addEventListener('click', (e) => {
    const target = e.target.closest('a, button');
    if (target && target.closest('.block-element')) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Interaction intercepted to prevent navigation in editor.');
    }
}, true); // Use capture phase to intercept before specific block listeners if any


window.selectBlock = function (index) {
    state.selectedId = index;
    renderCanvas();

    // Show Settings
    const block = state.blocks[index];
    if (!block) return;

    const registry = BlockRegistry.get(block.type);

    settings.classList.remove('hidden');
    if (registry.getSettings) {
        settingsContent.innerHTML = registry.getSettings(block.data);
        // Bind settings inputs
        settingsContent.querySelectorAll('input, select, textarea').forEach(input => {
            const eventType = input.type === 'range' || input.tagName === 'SELECT' ? 'change' : 'input';
            input.addEventListener(eventType, (e) => {
                const prop = e.target.dataset.prop;
                state.blocks[index].data[prop] = e.target.value;
                renderCanvas(); // Re-render to show live preview
            });
            // For range sliders, also update on input for smoother feedback
            if (input.type === 'range') {
                input.addEventListener('input', (e) => {
                    const prop = e.target.dataset.prop;
                    state.blocks[index].data[prop] = e.target.value;
                    renderCanvas();
                });
            }
        });
    } else {
        settingsContent.innerHTML = '<p class="text-sm text-gray-500">No additional settings for this block.</p>';
    }
}

window.moveBlock = function (index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= state.blocks.length) return;

    const element = state.blocks.splice(index, 1)[0];
    state.blocks.splice(newIndex, 0, element);

    // Update selectedId to follow the moved block
    if (state.selectedId === index) {
        state.selectedId = newIndex;
    } else if (state.selectedId === newIndex) {
        state.selectedId = index;
    }

    renderCanvas();
}

window.removeBlock = function (index) {
    if (confirm('Are you sure you want to remove this block?')) {
        state.blocks.splice(index, 1);
        if (state.selectedId === index) state.selectedId = null;
        settings.classList.add('hidden');
        renderCanvas();
    }
}


// --- Persistence ---

window.openHeroPicker = function () {
    if (window.dashboardAPI && window.dashboardAPI.openMediaPicker) {
        window.dashboardAPI.openMediaPicker({
            onSelect: (url) => {
                const input = document.getElementById('heroImageUrl');
                if (input) {
                    input.value = url;
                    // Trigger input event to update state and canvas preview
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
    } else {
        alert('Media Picker not available.');
    }
}

window.openImageBlockPicker = function () {
    if (window.dashboardAPI && window.dashboardAPI.openMediaPicker) {
        window.dashboardAPI.openMediaPicker({
            onSelect: (url) => {
                const input = document.getElementById('imageBlockUrl');
                if (input) {
                    input.value = url;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });
    } else {
        alert('Media Picker not available.');
    }
}

window.savePage = async function () {
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    // Generate static HTML content for SEO/Compatibility
    let combinedHtml = '';
    state.blocks.forEach(b => {
        const registry = BlockRegistry.get(b.type);
        combinedHtml += registry.render(b.data);
    });

    try {
        const pageId = window.location.pathname.split('/').pop();
        const response = await fetch(`/admin/page-builder/api/save/${pageId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                blocks: state.blocks,
                content: combinedHtml
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('Page saved successfully!');
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to save page.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Changes';
    }
}


init();
