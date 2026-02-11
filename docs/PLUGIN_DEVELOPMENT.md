# 🧩 StoreCMS Plugin Development Guide

Welcome, developer! 👋

This guide will teach you how to create plugins for StoreCMS. Plugins are the best way to add new features, change the look of your store, or integrate with third-party services without touching the core code.

---

## 📚 Table of Contents
1. [What is a Plugin?](#1-what-is-a-plugin)
2. [Folder Structure](#2-folder-structure)
3. [The Manifest (`manifest.json`)](#3-the-manifest)
4. [The Main Logic (`index.js`)](#4-the-main-logic)
5. [Core Concepts](#5-core-concepts)
6. [Step-by-Step Tutorial: Announcement Bar](#6-step-by-step-tutorial)
7. [Advanced Tutorial: Partner Logos](#7-advanced-tutorial-partner-logos)
8. [Core Features & Models](#8-core-features--models)
9. [Creating Your Own Hooks](#9-creating-your-own-hooks)
10. [Security & Utilities](#10-security--utilities)

---

## 1. What is a Plugin?

A plugin is simply a **folder** inside the `plugins/` directory. When StoreCMS starts, it looks for these folders, reads their configuration, and runs their code.

**Why use plugins?**
- **Safety**: Your code is separate from the core system.
- **Portability**: You can easily copy your plugin to another StoreCMS site.
- **Updates**: You can update the core CMS without losing your custom work.

---

## 2. Installing & Sharing Plugins 📦

### A. How to Install a Plugin
**Method 1: The Easy Way (Admin Panel)**
1.  Go to your Admin Dashboard > **Plugins**.
2.  Click **"Upload Plugin"**.
3.  Select the `.zip` file of the plugin.
4.  The system will automatically install and enable it!

**Method 2: The Manual Way (Developer Mode)**
1.  Copy the plugin folder into the `plugins/` directory.
2.  Restart the server.

### B. How to Share Your Plugin
To share your plugin with others:
1.  Compress your plugin folder (e.g., `my-plugin/`) into a **.zip** file.
2.  That's it! Users can now upload this zip to their store.

---

## 2. Folder Structure

Every plugin follows a standard structure. Let's say we are building a plugin called `my-custom-plugin`.

```text
plugins/
└── my-custom-plugin/           <-- Your Plugin Folder
    ├── manifest.json           <-- REQUIRED: ID card for your plugin
    ├── index.js                <-- REQUIRED: The brain of your plugin
    ├── views/                  <-- OPTIONAL: HTML/EJS templates
    │   └── settings.ejs
    └── public/                 <-- OPTIONAL: CSS, JS, Images
        ├── css/
        │   └── style.css
        └── js/
            └── script.js
```

---

## 3. The Manifest (`manifest.json`)

**File Path:** `plugins/my-custom-plugin/manifest.json`

This file tells StoreCMS usage information about your plugin.

```json
{
    "name": "my-custom-plugin",
    "version": "1.0.0",
    "description": "My first awesome plugin!",
    "icon": "bi-puzzle", 
    "main": "index.js"
}
```
*   **name**: Must be unique (use lowercase and hyphens).
*   **icon**: We use [Bootstrap Icons](https://icons.getbootstrap.com/). Just put the class name here (e.g., `bi-star-fill`).
*   **main**: The file to load (usually `index.js`).

---

## 4. The Main Logic (`index.js`)

**File Path:** `plugins/my-custom-plugin/index.js`

This is where the magic happens. Your `index.js` must export an object with an `init` function. The CMS calls this function instantly when the server starts.

### The `init` Function

StoreCMS gives you 4 powerful tools when it starts your plugin:

```javascript
module.exports = {
    name: 'my-custom-plugin',
    version: '1.0.0',
    description: 'Example plugin logic',

    // 👇 This checks in when the server boots up
    async init(app, HookSystem, MediaAPI, { protect, adminMenuMiddleware }, PluginManager) {
        
        console.log("My plugin is alive!");

        // 1. app: The Express Application
        //    Use this to create routes (URLs) like /my-plugin-page
        
        // 2. HookSystem: The Event Manager
        //    Use this to modify content on the fly (see Section 5)
        
        // 3. MediaAPI: File Uploader
        //    Use this if you need to upload images
        
        // 4. Middleware: Security Tools
        //    - protect: Ensures only logged-in Admins can access your routes
        //    - adminMenuMiddleware: Helps render the sidebar menu

        // 5. PluginManager: Status Check
        //    - isPluginActive('plugin-name'): Check if your plugin is enabled
    }
};
```

---

## 5. Core Concepts

Here are the four pillars of building a StoreCMS plugin.

### A. Admin Routes (Custom Dashboard Pages)
**File Path:** `plugins/my-custom-plugin/index.js`

You can add your own pages to the Admin Dashboard.

```javascript
const express = require('express');
const router = express.Router();

// Secure it so only admins can see it
router.use(protect);
router.use(adminMenuMiddleware);

router.get('/', (req, res) => {
    res.send('<h1>Administrator Settings</h1>');
});

// Mount it at /admin/my-plugin
app.use('/admin/my-plugin', router);
```

### B. Views (EJS Templates)
**File Path:** `plugins/my-custom-plugin/views/settings.ejs`

Instead of writing HTML in strings, you can use EJS templates.

```javascript
const path = require('path');

// Tell Express where your views are
app.set('views', [
    path.join(__dirname, 'views'),
    ...app.get('views')
]);

// Render it
router.get('/', (req, res) => {
    res.render('settings', { title: 'My Settings' }); // Renders views/settings.ejs
});
```

### C. Static Assets (CSS & JS)
**File Path:** `plugins/my-custom-plugin/public/css/style.css`

Serve your own styles and scripts.

```javascript
// URL will be: /my-plugin-assets/css/style.css
app.use('/my-plugin-assets', express.static(path.join(__dirname, 'public')));
```

### D. The Hook System (Magic!) 🪄
**File Path:** `plugins/my-custom-plugin/index.js`

Hooks allow you to "interrupt" the CMS and change things before they are shown to the user.

**Common Hooks:**
- `head_content`: Add scripts or CSS links to the `<head>`.
- `frontend_header`: Add HTML to the top of the website.
- `frontend_footer`: Add HTML to the bottom of the website.

**Example: Adding a Custom CSS file**
```javascript
HookSystem.addFilter('head_content', (currentHtml) => {
    // Append your link
    return currentHtml + '<link rel="stylesheet" href="/my-plugin-assets/css/style.css">';
});
```


### E. Plugin Status & Deactivation 🛑

Plugins can be deactivated by the admin. To ensure your plugin stops working immediately (without a restart), you should check its status.

**1. The `PluginManager` Helper**
You receive `PluginManager` as the 5th argument in `init`. Use `PluginManager.isPluginActive('your-plugin-name')` to check if you are allowed to run.

**2. Protecting Admin Routes**
If a user deactivates your plugin, they shouldn't be able to access your settings page.
```javascript
router.use((req, res, next) => {
    if (!PluginManager.isPluginActive('my-custom-plugin')) {
        return res.status(403).send('Plugin is disabled');
    }
    next();
});
```

**3. Conditional Hooks**
You can choose whether your frontend content should disappear immediately or stay until restart.
```javascript
HookSystem.addFilter('frontend_header', (html) => {
    // Immediate Deactivation: Stop rendering content right away
    if (!PluginManager.isPluginActive('my-custom-plugin')) return html; 
    
    // Graceful Deactivation: Remove this line to keep content until restart
    return html + '<div>My Banner</div>';
});
```

---

## 6. Step-by-Step Tutorial: Announcement Bar 📢

Let's build a real plugin that adds a "Welcome" banner to the top of your site.

### Step A: Create the Folder
Go to your `plugins` folder and create a new folder named: `announcement-bar`

### Step B: The Manifest
**File Path:** `plugins/announcement-bar/manifest.json`

```json
{
    "name": "announcement-bar",
    "version": "1.0.0",
    "description": "Adds a welcome banner to the top of the site.",
    "icon": "bi-megaphone"
}
```

### Step C: The Code
**File Path:** `plugins/announcement-bar/index.js`

```javascript
module.exports = {
    name: 'announcement-bar',
    version: '1.0.0',
    description: 'Displays a banner.',

    async init(app, HookSystem) {
        
        // We want to add HTML to the FRONTEND HEADER
        HookSystem.addFilter('frontend_header', (currentHeaderHtml) => {
            
            const myBanner = `
                <div style="background-color: #6366f1; color: white; text-align: center; padding: 10px; font-weight: bold;">
                    🎉 SPECIAL OFFER: Use code WELCOME2026 for 20% off!
                </div>
            `;

            // Valid HTML: Banner first, then the rest of the header
            return myBanner + currentHeaderHtml;
        });

        console.log('✅ Announcement Bar Plugin Loaded!');
    }
};
```

### Step D: Restart & Test
1.  Stop your server (Ctrl+C).
2.  Run `npm start` again.
3.  Check your terminal for: `✅ Announcement Bar Plugin Loaded!`.
4.  Open your website homepage. You should see the purple banner at the very top!

---

## 8. Core Features & Models 🧠

To build powerful plugins, you need to interact with the StoreCMS core. Here is how.

### A. Database Models (Mongoose)

You can import and use the built-in database models to read/write data.

**Key Models:**
-   **Page**: `src/models/Page.js` (Content pages)
-   **User**: `src/models/User.js` (Admins and Customers)

**Example: Fetching all Pages**
```javascript
// Import the model using the global mongoose instance or by path
const mongoose = require('mongoose');
const Page = mongoose.model('Page'); 

async init(app) {
    app.get('/admin/my-plugin/count-pages', async (req, res) => {
        const count = await Page.countDocuments();
        res.send(`Total Pages: ${count}`);
    });
}
```

### B. Hook System Deep Dive

The `HookSystem` is how plugins interact with the core. It has two types:

#### 1. Filters (`addFilter`)
Filters **modify data**. They receive a value, change it, and must return it.

**Available Filters:**
| Hook Name | Description | Arguments |
| :--- | :--- | :--- |
| `head_content` | Add content to `<head>` (CSS/JS) | `currentHtml` |
| `frontend_header` | Prepend content to `<body>` | `currentHtml` |
| `frontend_footer` | Append content to `<footer>` | `currentHtml` |
| `page_content` | Modify the main page HTML | `content`, `pageObject` |
| `header_nav_links` | Modify navigation menu items | `linksArray` |

**Example:**
```javascript
HookSystem.addFilter('frontend_footer', (html) => {
    return html + '<script src="analytics.js"></script>';
});
```

#### 2. Actions (`addAction`)
Actions **do something** when an event happens. They don't return anything.

**Available Actions:**
| Hook Name | Description | Arguments |
| :--- | :--- | :--- |
| `user_login` | Fired after successful login | `userObject` |

**Example:**
```javascript
HookSystem.addAction('user_login', (user) => {
    console.log(`User ${user.email} just logged in!`);
});
```

### C. Environment Variables

StoreCMS automatically loads variables from `.env`. You can access them using `process.env`.

**Best Practice**: Prefix your plugin's variables to avoid collisions.
-   `MYPLUGIN_API_KEY`
-   `MYPLUGIN_SECRET`

```javascript
async init(app) {
    const apiKey = process.env.MYPLUGIN_API_KEY;
    if (!apiKey) {
        console.warn('Warning: MYPLUGIN_API_KEY is missing!');
    }
}
```

Ready to use **everything**? Let's build a plugin that allows you to upload "Partner Logos" in the admin panel and display them in the website footer.

This will use:
1.  `app`: To create the admin dashboard page.
2.  `Middleware`: To secure the page (`protect`) and add it to the menu (`adminMenuMiddleware`).
3.  `MediaAPI`: To upload the logo files.
4.  `HookSystem`: To show the logos on the frontend.

### Step A: Folder & Manifest
**File:** `plugins/partner-logos/manifest.json`
```json
{
    "name": "partner-logos",
    "version": "1.0.0",
    "description": "Upload and display partner logos.",
    "icon": "bi-images"
}
```

### Step B: The Code
**File:** `plugins/partner-logos/index.js`

```javascript
const express = require('express');
const router = express.Router();

let logos = []; // Simple in-memory storage (reset on restart)

module.exports = {
    name: 'partner-logos',
    version: '1.0.0',
    description: 'Partner logos manager',

    async init(app, HookSystem, MediaAPI, { protect, adminMenuMiddleware }) {
        
        // --- 1. ADMIN PAGE SETUP ---
        
        // Use middleware to Login-Protect this route AND add to Sidebar
        router.use(protect);
        router.use(adminMenuMiddleware);

        // GET: Show the upload form
        router.get('/', (req, res) => {
            let html = `
                <div style="padding: 20px;">
                    <h1>Partner Logos</h1>
                    <form method="POST" enctype="multipart/form-data" style="margin-bottom: 20px;">
                        <input type="file" name="image" required />
                        <button type="submit">Upload Logo</button>
                    </form>
                    <div style="display: flex; gap: 10px;">
            `;
            
            logos.forEach(url => {
                html += `<img src="${url}" style="height: 50px; border: 1px solid #ccc;">`;
            });
            
            html += `</div></div>`;
            res.send(html);
        });

        // POST: Handle the upload
        // We use MediaAPI.upload as middleware to handle the file
        router.post('/', MediaAPI.upload, async (req, res) => {
            if (req.file) {
                // Save the file (Cloud or Local is handled automatically)
                const url = await MediaAPI.saveMedia(req.file);
                logos.push(url);
            }
            res.redirect('/admin/partner-logos');
        });

        // Mount the router
        app.use('/admin/partner-logos', router);


        // --- 2. FRONTEND DISPLAY ---

        // Inject logos into the footer
        HookSystem.addFilter('frontend_footer', (currentFooter) => {
            if (logos.length === 0) return currentFooter;

            const logoHtml = `
                <div style="background: #f3f4f6; padding: 20px; text-align: center;">
                    <h4>Our Partners</h4>
                    ${logos.map(url => `<img src="${url}" style="height: 40px; margin: 0 10px;">`).join('')}
                </div>
            `;
            
            // Add our logos BEFORE the actual footer
            return logoHtml + currentFooter;
        });

        console.log('✅ Partner Logos Plugin Loaded!');
    }
};
```

### Try it out!
1.  Restart server (`npm start`).
2.  Go to **Admin > Partner Logos** (it's in the menu!).
3.  Upload an image.
4.  Go to your Homepage and scroll to the bottom. You'll see your uploaded logo!

---

---

## 9. Creating Your Own Hooks 🎣

Yes! You can allow **other plugins** to extend *your* plugin. This is how you build an ecosystem.

### How to Create a Filter
If you have a variable that others might want to change, wrap it in `applyFilter`.

```javascript
// Inside your plugin's code
let welcomeMessage = "Hello World";

// Allow other plugins to change this message
welcomeMessage = await HookSystem.applyFilter('my_plugin_welcome_message', welcomeMessage);

console.log(welcomeMessage); 
// Output might be "Hello Universe" if another plugin filtered it!
```

### How to Create an Action
If you want to notify others that something happened, use `doAction`.

```javascript
// Inside your plugin's logic
function processPayment(orderId) {
    console.log("Payment Processed");

    // Notify other plugins
    HookSystem.doAction('payment_completed', orderId);
}
```

---

---

## 10. Security & Utilities 🛡️

StoreCMS provides built-in tools to keep your plugin secure and handle common tasks.

### A. Authentication Middleware

Use these to protect your routes.

1.  **`protect`**: Ensures the user is logged in.
    ```javascript
    const { protect } = require('../../src/middlewares/authMiddleware');
    router.get('/my-dashboard', protect, (req, res) => { ... });
    ```

2.  **`authorize(...roles)`**: Ensures the user has a specific role.
    ```javascript
    const { authorize } = require('../../src/middlewares/authMiddleware');
    // Only 'admin' can see this
    router.get('/settings', protect, authorize('admin'), (req, res) => { ... });
    ```

### B. The User Object (`req.user`)

If a user is logged in (or if you use `protect`), `req.user` contains:
```javascript
{
    _id: "65d4...",
    username: "admin",
    email: "admin@example.com",
    role: "admin" // 'admin', 'customer', or 'editor'
}
```

### C. Media Handling (`MediaAPI`)

Don't write your own file uploader! Use ours. It handles Local Disk vs ImageKit automatically.

1.  **`MediaAPI.upload`**: Express middleware for `multipart/form-data`.
    ```javascript
    router.post('/upload', MediaAPI.upload, (req, res) => { ... });
    ```

2.  **`MediaAPI.saveMedia(file)`**: Saves the file and returns a URL.
    ```javascript
    const url = await MediaAPI.saveMedia(req.file);
    ```

---

## 11. Next Steps

-   **Check Existing Plugins**: Look at `plugins/page-builder` or `plugins/nav-manager` for inspiration.
-   **Join the Community**: Share your plugins with us!

**Happy Coding! 🚀**
