/**
 * StoreCMS Global Dashboard API
 * Provides reusable UI components for plugins and core features.
 */

window.dashboardAPI = {
    /**
     * Opens a global Media Picker modal.
     * @param {Object} options - { onSelect: (url) => { ... } }
     */
    openMediaPicker: function (options) {
        const { onSelect } = options;

        // Remove existing modal if any
        const existing = document.getElementById('globalMediaPickerModal');
        if (existing) existing.remove();

        // Create Modal Structure
        const modalHtml = `
            <div id="globalMediaPickerModal" class="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"></div>
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-xl overflow-hidden shadow-xl transform transition-all sm:max-w-4xl sm:w-full">
                        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 class="text-xl font-bold text-gray-800">Select Media</h3>
                            <button onclick="document.getElementById('globalMediaPickerModal').remove()" class="text-gray-400 hover:text-gray-600">
                                <i class="bi bi-x-lg text-xl"></i>
                            </button>
                        </div>
                        <div class="p-6">
                            <div id="pickerMediaGrid" class="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                                <div class="col-span-full py-20 text-center text-gray-400">
                                    <span class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></span>
                                    <p>Loading your media library...</p>
                                </div>
                            </div>
                        </div>
                        <div class="px-6 py-4 bg-gray-50 flex justify-end">
                            <button onclick="document.getElementById('globalMediaPickerModal').remove()" class="px-4 py-2 text-gray-600 font-medium hover:text-gray-800">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Load Media Data
        this._loadPickerMedia(onSelect);
    },

    _loadPickerMedia: async function (onSelect) {
        const grid = document.getElementById('pickerMediaGrid');
        try {
            const res = await fetch('/admin/media/api/list?limit=100&skip=0');
            const data = await res.json();

            if (data.files && data.files.length > 0) {
                grid.innerHTML = '';
                data.files.forEach(file => {
                    const item = document.createElement('div');
                    item.className = 'group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-indigo-500 transition-all';
                    item.innerHTML = `
                        <img src="${file.thumbnail}" class="w-full h-full object-cover" alt="${file.name}">
                        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                        <div class="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p class="text-[10px] text-white bg-black bg-opacity-50 px-1 rounded truncate">${file.name}</p>
                        </div>
                    `;
                    item.onclick = () => {
                        onSelect(file.url);
                        document.getElementById('globalMediaPickerModal').remove();
                    };
                    grid.appendChild(item);
                });
            } else {
                grid.innerHTML = '<div class="col-span-full py-20 text-center text-gray-500"><i class="bi bi-images text-4xl mb-4 block opacity-20"></i>No media found. Upload some in the Media Library first.</div>';
            }
        } catch (err) {
            grid.innerHTML = '<div class="col-span-full py-20 text-center text-red-500">Error loading media. Please try again later.</div>';
        }
    }
};
