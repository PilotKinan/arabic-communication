// In script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- Add xlsx script for Excel file processing ---
    const xlsxScript = document.createElement('script');
    // Using a CDN for the xlsx library. You can also host it locally.
    xlsxScript.src = "https://unpkg.com/xlsx/dist/xlsx.full.min.js";
    xlsxScript.onload = () => {
        console.log('xlsx library loaded.');
    };
    document.head.appendChild(xlsxScript);

    // --- Mobile Adjustments ---
    // 1. Add viewport meta tag for mobile responsiveness.
    let viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
        viewportMeta = document.createElement('meta');
        viewportMeta.name = 'viewport';
        viewportMeta.content = 'width=device-width, initial-scale=1.0';
        document.head.appendChild(viewportMeta);
    }

    // 2. Create and inject responsive CSS, including a hamburger menu.
    const style = document.createElement('style');
    style.textContent = `
        /* Hamburger Menu Icon */
        .hamburger-menu {
            display: none; /* Hidden by default */
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            font-size: 24px;
            background: #f4f4f4;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 5px 10px;
            cursor: pointer;
        }
        
        .search-container {
            display: flex;
            align-items: center;
            gap: 5px;
        }

        @media (max-width: 768px) {
            body {
                flex-direction: column !important;
            }

            .hamburger-menu {
                display: block; /* Show on mobile */
            }

            .sidebar {
                position: fixed !important;
                left: -100%; /* Hide off-screen by default */
                top: 0;
                width: 80% !important;
                max-width: 300px;
                height: 100% !important;
                z-index: 1000;
                background-color: #fff;
                box-shadow: 2px 0 5px rgba(0,0,0,0.2);
                transition: left 0.3s ease-in-out;
                padding-top: 60px; /* Space for hamburger menu */
            }

            .sidebar.open {
                left: 0; /* Slide in when open */
            }

            .main-content {
                margin-left: 0 !important;
                padding-top: 60px; /* Add space for the fixed hamburger menu */
            }
        }
    `;
    document.head.appendChild(style);

    const topicsNav = document.getElementById('topics-nav');
    const contentArea = document.getElementById('content-area');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    let allData = []; // To store all words for searching
    let lastActiveView = null; // To remember the last view before searching

    // 3. Create and add hamburger menu icon to the body.
    const hamburger = document.createElement('div');
    hamburger.className = 'hamburger-menu';
    hamburger.innerHTML = '&#9776;'; // Hamburger icon
    document.body.appendChild(hamburger);

    // 4. Add event listener for the hamburger menu.
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        hamburger.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Close sidebar when clicking outside of it on mobile
        document.addEventListener('click', (e) => {
            // Check if the click is outside the sidebar AND not on the hamburger menu itself
            if (
                window.innerWidth <= 768 &&
                sidebar.classList.contains('open') &&
                !sidebar.contains(e.target) && !hamburger.contains(e.target)
            ) {
                sidebar.classList.remove('open');
            }
        });
    }
    // --- End of Mobile Adjustments ---

    // --- Excel Update Feature ---
    function addUpdateDataButton() {
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        const updateButton = document.createElement('div');
        updateButton.id = 'upload-excel-btn';
        updateButton.innerHTML = '&#x1F4E4;'; // Unicode for "incoming envelope"
        updateButton.title = 'Update data from Excel file';
        updateButton.style.cursor = 'pointer';
        updateButton.style.fontSize = '20px';
        updateButton.style.padding = '5px 8px';
        updateButton.style.backgroundColor = '#28a745';
        updateButton.style.color = '#fff';
        updateButton.style.borderRadius = '50%';
        updateButton.style.lineHeight = '1';
        updateButton.style.marginLeft = '5px';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = ".xlsx, .xls";
        fileInput.style.display = 'none';

        updateButton.addEventListener('click', () => {
            const password = prompt("Please enter the password to upload a new Excel file:");
            if (password === "Upload@Excel") {
                fileInput.click();
            } else if (password !== null) {
                alert("Incorrect password.");
            }
        });
        fileInput.addEventListener('change', handleFileUpdate);

        searchContainer.appendChild(updateButton);
        searchContainer.appendChild(fileInput);
    }

    function handleFileUpdate(event) {
        const file = event.target.files[0];
        if (!file || typeof XLSX === 'undefined') return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});

            const newData = [];
            // Use only the first sheet, as the logic is to find subtitles within one sheet.
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert sheet to JSON. `defval: null` is important to detect empty cells.
            const sheetJson = XLSX.utils.sheet_to_json(worksheet, { defval: null });

            let currentCategory = null;

            sheetJson.forEach(row => {
                // Ensure your Excel column headers are exactly 'English', 'Pronunciation', 'Arabic'
                const english = row.English;
                const pronunciation = row.Pronunciation;
                const arabic = row.Arabic;

                // Rule: A row is a subtitle if 'English' has a value, but the others are empty.
                if (english && !pronunciation && !arabic) {
                    currentCategory = {
                        category: english,
                        terms: []
                    };
                    newData.push(currentCategory);
                }
                // Rule: A row is a term if all three columns have values AND we are inside a category.
                else if (english && pronunciation && arabic && currentCategory) {
                    currentCategory.terms.push({
                        english: english,
                        pronunciation: pronunciation,
                        arabic: arabic
                    });
                }
                // Other rows (like blank rows) are ignored.
            });

            // Re-initialize the application with the new data
            localStorage.setItem('arabicCommunicationData', JSON.stringify(newData));
            reinitializeWithData(newData);
            alert('Data updated successfully from ' + file.name);
        };
        reader.readAsArrayBuffer(file);
    }
    // --- End of Excel Update Feature ---
    
    function loadInitialData() {
        const storedData = localStorage.getItem('arabicCommunicationData');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                console.log("Loading data from localStorage.");
                initialize(data);
            } catch (e) {
                console.error("Error parsing data from localStorage, fetching from file.", e);
                fetchFromFile();
            }
        } else {
            fetchFromFile();
        }
    }

    function fetchFromFile() {
        console.log("Fetching data from words.json.");
        fetch('data/words.json')
            .then(response => response.json())
            .then(data => initialize(data))
            .catch(error => {
                console.error('Error fetching data:', error);
                contentArea.innerHTML = `<div class="welcome-card"><p>Error: Could not load the learning data. Please check the data file and try again.</p></div>`;
                addUpdateDataButton(); // Also add button on error to allow manual update
            });
    }

    function initialize(data) {
        allData = data;
        populateTopics(data);
        lastActiveView = { type: 'welcome' };
        contentArea.innerHTML = `<div class="welcome-card"><h2>Welcome, Nurse!</h2><p>Select a topic from the left to start learning, or use the search bar to find a specific term.</p></div>`;
        addUpdateDataButton();
    }

    // Function to re-initialize the app with new data
    function reinitializeWithData(data) {
        allData = data;
        topicsNav.innerHTML = ''; // Clear old topics from the sidebar
        populateTopics(allData);  // Repopulate sidebar with new topics

        // Manually set the "Show All" view with the new data
        document.querySelectorAll('.topics-nav a').forEach(a => a.classList.remove('active'));
        document.getElementById('show-all-link')?.classList.add('active');
        displayAllCategories(allData);
        lastActiveView = { type: 'all' };
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
    }

    // Handle click on the clear search button
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        // Manually trigger the input event to restore the view
        searchInput.dispatchEvent(new Event('input'));
    });

    // 1. Load initial data
    loadInitialData();

    // 2. Populate the topics in the sidebar
    function populateTopics(data) {
        // Create and add "Show All" link first
        const showAllLink = document.createElement('a');
        showAllLink.href = '#';
        showAllLink.textContent = 'Show All';
        showAllLink.id = 'show-all-link'; // Give it an ID for easy selection

        showAllLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state for links
            document.querySelectorAll('.topics-nav a').forEach(a => a.classList.remove('active'));
            showAllLink.classList.add('active');

            displayAllCategories(data);
            lastActiveView = { type: 'all' }; // Remember that "Show All" is active
            searchInput.value = ''; // Clear search
        });
        topicsNav.appendChild(showAllLink);

        data.forEach((categoryData, index) => {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = categoryData.category;
            link.dataset.index = index; // Store index to retrieve data later
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Update active state for links
                document.querySelectorAll('.topics-nav a').forEach(a => a.classList.remove('active'));
                link.classList.add('active');

                displayCategory(categoryData);
                lastActiveView = { type: 'category', data: categoryData }; // Remember the specific category
                searchInput.value = ''; // Clear search when a topic is clicked
            });

            topicsNav.appendChild(link);
        });
    }

    // 3. Display the selected category's card and terms
    function displayCategory(categoryData) {
        contentArea.innerHTML = ''; // Clear previous content

        const card = document.createElement('div');
        card.className = 'category-card';

        let tableRows = categoryData.terms.map(term => `
            <tr>
                <td>${term.english}</td>
                <td>${term.pronunciation}</td>
                <td class="arabic-term">${term.arabic}</td>
            </tr>
        `).join('');

        card.innerHTML = `
            <div class="category-header">
                <h3>${categoryData.category}</h3>
            </div>
            <div class="table-wrapper">
                <table class="terms-table">
                    <thead>
                        <tr>
                            <th>English</th>
                            <th>Pronunciation</th>
                            <th style="text-align: right;">Arabic</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
        contentArea.appendChild(card);
    }

    // NEW: Function to display all categories at once
    function displayAllCategories(data) {
        contentArea.innerHTML = ''; // Clear previous content

        if (data.length === 0) {
            contentArea.innerHTML = `<div class="welcome-card"><h2>No topics found.</h2></div>`;
            return;
        }

        const recordCount = data.reduce((sum, category) => sum + category.terms.length, 0);

        data.forEach(categoryData => {
            const card = document.createElement('div');
            card.className = 'category-card';

            if (categoryData.terms.length === 0) return;

            let tableRows = categoryData.terms.map(term => `
                <tr>
                    <td>${term.english}</td>
                    <td>${term.pronunciation}</td>
                    <td class="arabic-term">${term.arabic}</td>
                </tr>
            `).join('');

            card.innerHTML = `
                <div class="category-header">
                    <h3>${categoryData.category}</h3>
                </div>
                <div class="table-wrapper">
                    <table class="terms-table">
                        <thead><tr><th>English</th><th>Pronunciation</th><th style="text-align: right;">Arabic</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
            contentArea.appendChild(card);
        });
    }

    // 4. Handle search functionality
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        clearSearchBtn.style.display = searchTerm ? 'block' : 'none';

        // If the search term is short, restore the last active view
        if (searchTerm.length === 0) {
            if (lastActiveView) {
                if (lastActiveView.type === 'all') {
                    displayAllCategories(allData);
                    document.getElementById('show-all-link')?.classList.add('active');
                } else if (lastActiveView.type === 'category') {
                    displayCategory(lastActiveView.data);
                    // Find and activate the correct link
                    const categoryIndex = allData.findIndex(cat => cat.category === lastActiveView.data.category);
                    document.querySelector(`.topics-nav a[data-index="${categoryIndex}"]`)?.classList.add('active');
                } else if (lastActiveView.type === 'welcome') {
                    // Restore the initial welcome message
                    contentArea.innerHTML = `<div class="welcome-card">
                        <h2>Welcome, Nurse!</h2>
                        <p>Select a topic from the left to start learning, or use the search bar to find a specific term.</p>
                    </div>`;
                }
            } else {
                // Default to welcome message if something went wrong
                contentArea.innerHTML = `<div class="welcome-card">
                    <h2>Welcome, Nurse!</h2>
                    <p>Select a topic from the left to start learning, or use the search bar to find a specific term.</p></div>`;
            }
            return;
        }

        // When a search starts, remove the active state from all topic links.
        document.querySelectorAll('.topics-nav a').forEach(a => a.classList.remove('active'));

        const searchResults = [];
        allData.forEach(category => {
            category.terms.forEach(term => {
                if (
                    String(term.english).toLowerCase().includes(searchTerm) ||
                    String(term.pronunciation).toLowerCase().includes(searchTerm) ||
                    String(term.arabic).toLowerCase().includes(searchTerm)
                ) {
                    searchResults.push(term);
                }
            });
        });

        displaySearchResults(searchResults, searchTerm);
    });

    // 5. Display search results
    function displaySearchResults(results, searchTerm) {
        contentArea.innerHTML = ''; // Clear previous content
        const card = document.createElement('div');
        card.className = 'category-card';

        if (results.length === 0) {
            card.innerHTML = `
                <h3>Search Results</h3>
                <p>No terms found for "${searchTerm}".</p>
            `;
        } else {
            let tableRows = results.map(term => `
                <tr>
                    <td>${term.english}</td>
                    <td>${term.pronunciation}</td>
                    <td class="arabic-term">${term.arabic}</td>
                </tr>
            `).join('');

            card.innerHTML = `
                <div class="category-header search-header">
                    <h3>Search Results for "${searchTerm}"</h3>
                    <span class="record-count">${results.length} found</span>
                </div>
                <div class="table-wrapper">
                    <table class="terms-table">
                        <thead>
                            <tr>
                                <th>English</th>
                                <th>Pronunciation</th>
                                <th style="text-align: right;">Arabic</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
            `;
        }
        contentArea.appendChild(card);
    }
});
