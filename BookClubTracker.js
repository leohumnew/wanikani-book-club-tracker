// ==UserScript==
// @name         WK Book Club Tracker
// @namespace    http://tampermonkey.net/
// @version      0.5.4
// @description  Add a panel to the WK Readers page to track book club progress
// @author       leohumnew
// @match        https://www.wanikani.com/*
// @match        https://community.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        GM_setValue
// @grant        GM_getValue
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    /*  1. Helper functions
        2. Dashboard
        3. Readers
            a. Syling
            b. Book club panel
            c. Load / save
            d. Popup menu
        4. Main script
        5. Community Pages */

    // ------------------ HELPER FUNCTIONS ------------------
    function createButton(text, clickHandler) { // Create a button with the given text and click handler
        let button = document.createElement('button');
        button.innerHTML = text;
        button.addEventListener("click", clickHandler);
        return button;
    }

    function dateFromString(dateString) { // Create a date object from a string in the format "YYYY-MM-DD"
        let date = new Date();
        date.setDate(dateString.substring(8, 10));
        date.setMonth(dateString.substring(5, 7) - 1);
        date.setFullYear(dateString.substring(0, 4));
        date.setHours(12, 0, 0, 0);
        return date;
    }

    // Create a popup menu to manually add or edit a book club
    function manualAddEdit(bookClub, isCreating, canEditTitle = false) {
        // Create a container for all the text inputs, then add them with an html string to the popupForm's innerHTML
        let popupForm = document.createElement('form');
        popupForm.className = "edit-popup__form";
        popupForm.innerHTML = "<label for='title'>Title</label>" + (isCreating ? "<input type='text' id='title' name='title' placeholder='Title' required>" : "<input type='text' id='title' name='title' placeholder='Title' required value='" + bookClub.title + (canEditTitle ? "'>" : "' disabled>"));
        popupForm.innerHTML += `
            <br><label for='url'>Main Thread URL</label><input type='text' id='url' name='url' placeholder='URL' required value='` + (isCreating ? "" : bookClub.url) + `'><br>
            <label for='vocabListUrl'>Vocab List URL</label><input type='text' id='vocabListUrl' name='vocabListUrl' placeholder='URL' value='` + (isCreating ? "" : bookClub.vocabListUrl) + `'><br>
            <label for='totalPages'>Total Pages</label><input type='number' id='totalPages' name='totalPages' placeholder='Total Pages' required value=` + (isCreating ? "" : bookClub.totalPages) + `><br>
            <label for='weeksInfo'>Weeks Info</label>
        `;
        let weeksInfoContainer = document.createElement('div');
        weeksInfoContainer.id = "weeksInfo";
        popupForm.appendChild(weeksInfoContainer);
        let saveButton = createButton("Save", null);
        popupForm.addEventListener("submit", function() {
            // Check if club with the same name already exists
            if (isCreating && bookClubs.find(bookClub => bookClub.title === document.querySelector("#title").value)) return alert("A book club with that name already exists.");
            if (isCreating || canEditTitle) {
                addBookClub(
                    document.querySelector("#title").value,
                    document.querySelector("#url").value,
                    document.querySelector("#vocabListUrl").value,
                    parseInt(document.querySelector("#totalPages").value),
                    weeksInfo,
                );
            } else {
                let bookClub = getBookClub(document.querySelector("#title").value);
                bookClub.url = document.querySelector("#url").value;
                bookClub.weeksInfo = weeksInfo;
                bookClub.vocabListUrl = document.querySelector("#vocabListUrl").value;
                bookClub.totalPages = parseInt(document.querySelector("#totalPages").value);
            }
            saveBookClubs();
            location.reload();
        });
        saveButton.type = "submit";
        saveButton.className = "wk-button--default";
        popupForm.appendChild(saveButton);

        // Set up weeks info content
        let weeksInfo = isCreating ? [] : bookClub.weeksInfo;
        let newWeekForm = document.createElement('form'); // Create week adding form
        newWeekForm.innerHTML = `
            <label for='startPage'>Start Page</label><input type='number' id='startPage' name='startPage' placeholder='Start Page' required>
            <label for='startDate'>Start Date</label><input type='date' id='startDate' name='startDate' placeholder='Start Date' required>
            <button type='submit' class='wk-icon fa-regular fa-plus'></button>
            <hr style="width: 100%;">
        `;
        newWeekForm.addEventListener("submit", function(e) {
            e.preventDefault();
            let newWeekInfo = { // Create new week info object, and add it to weeksInfo in the correct position according to start date (with week 1 at the start of the array)
                completed: false,
                startPage: parseInt(document.querySelector("#startPage").value),
                startDate: document.querySelector("#startDate").value
            };
            let index = weeksInfo.findIndex(week => dateFromString(week.startDate) > dateFromString(newWeekInfo.startDate));
            if (index === -1) {
                weeksInfo.push(newWeekInfo);
            } else {
                weeksInfo.splice(index, 0, newWeekInfo);
            }

            let weeksInfoList = document.querySelector("#weeksInfo ul");
            let weekElement = document.createElement('li'); // Create new week element, and insert it in weeksInfoList in the correct position
            let date = dateFromString(newWeekInfo.startDate);
            weekElement.innerHTML = "Week <span></span> - Start Page: " + newWeekInfo.startPage + " - Start Date: " + date.toLocaleDateString();
            let deleteWeekButton = createButton("", function() { // Create delete button
                weeksInfo.splice(index < 0 ? 0 : index, 1);
                weeksInfoList.removeChild(weekElement);
                for (let i = 0; i < weeksInfoList.childNodes.length; i++) { // Loop through weeksInfoList and update week numbers
                    weeksInfoList.childNodes[i].querySelector("span").innerHTML = i + 1;
                }
            });
            deleteWeekButton.className = "delete-week-button wk-icon fa-regular fa-times";
            weekElement.appendChild(deleteWeekButton);

            if(index != -1) weeksInfoList.insertBefore(weekElement, weeksInfoList.childNodes[index]);
            else weeksInfoList.appendChild(weekElement);

            for (let i = 0; i < weeksInfoList.childNodes.length; i++) { // Loop through weeksInfoList and update week numbers
                weeksInfoList.childNodes[i].querySelector("span").innerHTML = i + 1;
            }

            newWeekForm.reset();
            document.querySelector("#startPage").focus();
        });

        let weeksInfoList = document.createElement('ul'); // Create list of weeks
        for (let i = 0; i < weeksInfo.length; i++) {
            let week = weeksInfo[i];
            let weekElement = document.createElement('li');
            let date = dateFromString(week.startDate);
            weekElement.innerHTML = "Week <span>" + (i + 1) + "</span> - Start Page: " + week.startPage + " - Start Date: " + date.toLocaleDateString();
            let deleteWeekButton = createButton("", function() { // Create delete button for each week
                weeksInfo.splice(i, 1);
                weeksInfoList.removeChild(weekElement);
                for (let i = 0; i < weeksInfoList.childNodes.length; i++) { // Loop through weeksInfoList and update week numbers
                    weeksInfoList.childNodes[i].querySelector("span").innerHTML = i + 1;
                }
            });
            deleteWeekButton.className = "delete-week-button wk-icon fa-regular fa-times";
            weekElement.appendChild(deleteWeekButton);
            weeksInfoList.appendChild(weekElement);
        }

        weeksInfoContainer.append(newWeekForm, weeksInfoList);
        return popupForm;
    }

    // ----------- Load, save, add and delete book clubs from userscript storage -----------
    function loadBookClubs() {
        return GM_getValue("WaniKaniBookClubs", []);
    }
    function saveBookClubs() {
        GM_setValue("WaniKaniBookClubs", bookClubs);
    }
    function addBookClub(title, url, vocabListUrl, totalPages, weeksInfo) {
        bookClubs.push({
            title: title,
            url: url,
            vocabListUrl: vocabListUrl,
            totalPages: totalPages,
            weeksInfo: weeksInfo,
            active: true
        });
        saveBookClubs();
    }
    function deleteBookClub(title) { // Remove element using .splice() to avoid creating a new array
        let index = bookClubs.findIndex(bookClub => bookClub.title === title);
        bookClubs.splice(index, 1);
        saveBookClubs();
    }
    function toggleBookClubWeek(bookClubTitle, weekNumber) {
        let bookClub = getBookClub(bookClubTitle);
        bookClub.weeksInfo[weekNumber - 1].completed = !bookClub.weeksInfo[weekNumber - 1].completed;
        saveBookClubs();
    }
    // Get a specific book club from the list of book clubs by name
    function getBookClub(title) {
        return bookClubs.find(bookClub => bookClub.title === title);
    }

    // Main book clubs array
    let bookClubs;

    // ------------------ DASHBOARD ------------------
    if (!location.href.includes("community") && (location.pathname == "/dashboard" || location.pathname == "/")) {

        bookClubs = loadBookClubs();

        // Create and add styles to page
        let style1 = document.createElement('style');
        style1.innerHTML += "#book-clubs-container { background-color: var(--color-wk-panel-background); border-radius: 7px; padding: 10px; height: fit-content; max-height: 500px; overflow: hidden; overflow-y: auto; margin-bottom: 30px;} #book-clubs-container h3, #book-clubs-container p { margin: 0; }";
        style1.innerHTML += "#book-clubs-container .header-button { background-color: transparent; position: absolute; top: 0; right: 0; width: fit-content; padding: 2px 8px; }"; // Header button
        style1.innerHTML += ".book-clubs-list { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 30px; margin-bottom: 0; background-color: var(--color-wk-panel-background); } :root {--color-correct-light: color-mix(in srgb, var(--color-correct, #18811d), white); --color-incorrect-light: color-mix(in srgb, var(--color-incorrect, #811818), white); --color-tertiary-fix: var(--color-tertiary, #3b97f1); --color-menu-fix: var(--color-menu, #f5f5f5); }";
        style1.innerHTML += ".book-club { background-color: var(--color-wk-panel-content-background); border-radius: 7px; padding: 12px; width: 100%; }";
        style1.innerHTML += ".book-club .reader-summary__title { font-size: 1.5rem; }";
        style1.innerHTML += ".book-club .reader-summary__status button { text-decoration: underline; cursor: pointer; background: none; padding: 0; border: none; margin-top: -3px; } .book-club .reader-summary__status a { text-decoration: underline }"; // Book club active/inactive button and vocab sheet button
        style1.innerHTML += ".book-club .reader-summary__status button:hover, .book-club .reader-summary__status a:hover { color: var(--color-tertiary-fix) !important; }"; // Book club active/inactive button and vocab sheet button hover
        style1.innerHTML += ".action-button { margin-left: auto; background: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-mid); border: none; padding: 0; } .action-button:hover { color: var(--color-tertiary-fix); }"; // Delete book club button
        style1.innerHTML += ".book-club-weeks { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 15px; margin-top: 15px; } .book-club-weeks h4 { color: var(--color-text); filter: opacity(0.5); margin: 0; }"; // Weeks container
        style1.innerHTML += ".book-club-week { background-color: var(--color-wk-panel-background); border-radius: 4px; padding: 12px 16px; cursor: pointer; }";
        style1.innerHTML += ".book-club-week:hover { outline: 1px dashed var(--color-tertiary-fix); }";
        style1.innerHTML += ".book-club-week--missed h3 { font-weight: 600; color: var(--color-incorrect-light); }";
        style1.innerHTML += ".book-club-week--completed h3 { font-weight: 600; color: var(--color-correct-light); }";
        style1.innerHTML += ".book-club-week--active { font-weight: 600; border: 1px solid var(--color-tertiary-fix); } .book-club-week--active p { font-weight: normal; }";
        style1.innerHTML += ".book-club-week--inactive { filter: opacity(0.5); }";
        style1.innerHTML += ".background-overlay { background-color: rgba(0,0,0,0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; }";
        style1.innerHTML += ".edit-popup { background-color: var(--color-menu-fix); border-radius: 7px; padding: var(--spacing-loose); width: 50%; height: 50%; position: fixed; top: 50%; left: 50%; transform: translate(-50.12%, -50.12%); overflow-y: auto; }";
        style1.innerHTML += ".edit-popup h2 { text-align: center; font-size: 2rem; margin-bottom: var(--spacing-loose); } .edit-popup .action-button { position: absolute; top: 1em; right: 1em; }"; // Popup title and close button
        style1.innerHTML += ".edit-popup .popup-buttons { width: fit-content; position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%) } .edit-popup .popup-buttons button { margin: 0 10px; font-size: var(--font-size-large); cursor: pointer; }"; // Popup add/edit buttons
        style1.innerHTML += ".edit-popup__form > textarea { margin-bottom: var(--spacing-tight); margin-top: var(--spacing-tight); padding: 3px; border-radius: 4px; width: 100%; height: 200px; resize: none; }"; // Popup form textarea for JSON input
        style1.innerHTML += ".edit-popup__form > input { margin-bottom: var(--spacing-tight); padding: 3px; border-radius: 4px; background-color: var(--color-wk-panel-content-background); color: var(--color-text) }"; // Popup form input
        style1.innerHTML += ".edit-popup__form input:focus { outline: 1px solid var(--color-tertiary-fix); }";
        style1.innerHTML += ".edit-popup__form > label { font-weight: 600; }";
        style1.innerHTML += ".edit-popup #weeksInfo { background-color: var(--color-wk-panel-content-background); padding: 15px; border-radius: 7px; margin: 10px 0; } #weeksInfo li { margin-bottom: 5px; }"; // Popup weeks info
        style1.innerHTML += ".edit-popup #weeksInfo form { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 15px; }"; // Popup weeks info form for adding weeks
        style1.innerHTML += ".edit-popup #weeksInfo form button { padding: 3px; border-radius: 4px; cursor: pointer; margin-left: auto; border: none; } .edit-popup #weeksInfo ul button { padding: 3px; border-radius: 4px; cursor: pointer; margin-left: 10px; border: none; } #weeksInfo input { padding: 3px; border-radius: 4px; background-color: var(--color-menu-fix); }"; // Popup weeks info form button and input
        style1.innerHTML += ".edit-popup__form > button { margin: auto; cursor: pointer; width: 100%; }"; // Popup save button
        document.head.appendChild(style1);

        // Create the header for a "panel" (section with title + content)
        function createPanelHeader(text, button) {
            let panelTitle = document.createElement('div');
            panelTitle.style.position = "relative";
            let panelTitleText = document.createElement('h2');
            panelTitleText.innerHTML = text;
            panelTitleText.className = "dashboard-panel__title";
            panelTitle.appendChild(panelTitleText);
            if (button) { // If a button was passed in, add it to the right of the h2 element
                button.className += "header-button wk-button wk-button--default";
                panelTitle.appendChild(button);
            }
            return panelTitle;
        }

        // Create a panel body
        function createPanelBody(className) {
            let panelBody = document.createElement('section');
            panelBody.className = className;
            return panelBody;
        }

        // Create the book club panel
        function createBookClubPanel(bookClubInfo) {
            let bookClubPanel = document.createElement('div'); // Create a container div for the book club panel
            bookClubPanel.className = "book-club";

            let bookClubHeader = document.createElement('div'); // Create the header with the title and delete button
            bookClubHeader.style = "display: flex; position: relative;";
            let bookClubTitle = document.createElement('a');
            bookClubTitle.className = "reader-summary__title";
            bookClubTitle.href = bookClubInfo.url;
            bookClubTitle.target = "_blank";
            bookClubTitle.innerHTML = bookClubInfo.title;

            let editButton = createButton("", function() { // Create the edit button
                showBookClubEditPopup(false, bookClubInfo.title);
            });
            editButton.className = "action-button wk-icon fa-regular fa-pen-to-square";
            editButton.style = "font-size: large;";

            let deleteButton = createButton("", function() { // Create the delete button
                if (confirm("Are you sure you want to delete this book club?")) deleteBookClub(bookClubInfo.title);
                location.reload();
            });
            deleteButton.className = "action-button wk-icon fa-regular fa-times";
            deleteButton.style = "margin-left: 10px;";
            bookClubHeader.append(bookClubTitle, editButton, deleteButton);

            let bookClubSubTitle = document.createElement('span'); // Create the subtitle with the vocab list link and active status
            bookClubSubTitle.className = "reader-summary__status";
            if(bookClubInfo.vocabListUrl !== "")bookClubSubTitle.innerHTML = "<a target='_blank' href='" + bookClubInfo.vocabListUrl + "'>Vocab List</a> | ";
            let activeButton = createButton(bookClubInfo.active ? "Active" : "Inactive", function() {
                bookClubInfo.active = !bookClubInfo.active;
                saveBookClubs();
                location.reload();
            });
            activeButton.style.color += (bookClubInfo.active ? "var(--color-correct-light)" : "var(--color-incorrect-light)");
            bookClubSubTitle.appendChild(activeButton);

            let bookClubWeeks = document.createElement('div'); // Create a container div for the weeks or an "Inactive" message if the book club is inactive
            bookClubWeeks.className = "book-club-weeks";
            if (!bookClubInfo.active) {
                let inactiveMessage = document.createElement('h4');
                inactiveMessage.innerHTML = "Inactive Book Club";
                bookClubWeeks.appendChild(inactiveMessage);
            } else {
                for (let i = 0; i < bookClubInfo.weeksInfo.length; i++) { // Loop over each week and add it to the container
                    bookClubWeeks.appendChild(createWeekInfo(bookClubInfo, i));
                }
            }

            bookClubPanel.append(bookClubHeader, bookClubSubTitle, bookClubWeeks); // Append the header, subtitle and weeks to the book club panel
            return bookClubPanel;
        }

        function createWeekInfo(bookClubInfo, i) { // Create the div for a week in a book club
            let week = document.createElement('div'); // Create a div for the week and add a click handler to toggle the week's complete status
            week.className = "book-club-week";
            week.addEventListener("click", function() {
                toggleBookClubWeek(bookClubInfo.title, i + 1);
                week.replaceWith(createWeekInfo(bookClubInfo, i));
            });

            let weekTitle = document.createElement('h3'); // Create a title and info for the week
            weekTitle.innerHTML = "Week " + (i + 1);

            let weekInfo = document.createElement('p');
            weekInfo.innerHTML = "Pages: " + bookClubInfo.weeksInfo[i].startPage + " - " + (bookClubInfo.weeksInfo[i+1] ? bookClubInfo.weeksInfo[i+1].startPage - 1 : bookClubInfo.totalPages);
            weekInfo.innerHTML += "<br>Start Date: " + dateFromString(bookClubInfo.weeksInfo[i].startDate).toLocaleDateString();

            // Set week class depending on date and "complete" field
            let today = new Date();
            let nextWeekStartDate = i < bookClubInfo.weeksInfo.length - 1 ? dateFromString(bookClubInfo.weeksInfo[i + 1].startDate) : null;
            if (bookClubInfo.weeksInfo[i].completed) { // If week is completed, add completed class and add tick symbol to week title
                week.className += " book-club-week--completed";
                weekTitle.innerHTML += " <span class='wk-icon fa-regular fa-check' style='float: right'></span>";
            }

            if (today < dateFromString(bookClubInfo.weeksInfo[i].startDate)) { // If week is in the future, add inactive class
                week.className += " book-club-week--inactive";
            } else if (nextWeekStartDate && today >= nextWeekStartDate && !bookClubInfo.weeksInfo[i].completed) { // If week is missed, add missed class and add exclamation symbol to week title
                week.className += " book-club-week--missed";
                weekTitle.innerHTML += " <span class='wk-icon fa-regular fa-exclamation' style='float: right'></span>";
            } else if (bookClubInfo.active && today >= dateFromString(bookClubInfo.weeksInfo[i].startDate) && (!nextWeekStartDate || today < nextWeekStartDate)) { // If week is active, add active class
                week.className += " book-club-week--active";
            }

            week.append(weekTitle, weekInfo); // Append the title and info to the week div
            return week;
        }


        // ------------------ POPUP MENU ------------------
        // Create a popup menu to paste JSON
        function pasteJSON() {
            let popupForm = document.createElement('div');
            popupForm.className = "edit-popup__form";
            popupForm.innerHTML = `
                <label for='json'>JSON</label><textarea id='json' name='json' placeholder='JSON' required></textarea><br>
            `;
            let saveButton = createButton("Save", function() {
                let json = document.querySelector("#json").value;
                let bookClub = JSON.parse(json);
                // Loop through weeksInfo and add a "completed" field to each week, set to false
                bookClub.weeksInfo.forEach(week => {
                    week.completed = false;
                });
                addBookClub(bookClub.title, bookClub.url, bookClub.vocabListUrl, bookClub.totalPages, bookClub.weeksInfo);
                saveBookClubs();
                location.reload();
            });
            saveButton.className = "wk-button--default";
            popupForm.appendChild(saveButton);
            return popupForm;
        }

        // Create a popup menu to add/edit a book club
        function showBookClubEditPopup(isCreating, bookClubName) {
            let bookClub = isCreating ? null : getBookClub(bookClubName);

            let backgroundOverlay = document.createElement('div');
            backgroundOverlay.className = "background-overlay";
            let popup = document.createElement('div');
            popup.className = "edit-popup";
            backgroundOverlay.appendChild(popup);

            let popupTitle = document.createElement('h2');
            popupTitle.innerHTML = isCreating ? "Add Book Club" : "Edit Book Club";

            let closeButton = createButton("", function() {
                document.body.removeChild(backgroundOverlay);
            });
            closeButton.className = "wk-icon fa-regular fa-times action-button";
            popup.appendChild(closeButton);

            if(isCreating) { // If creating, add buttons to choose manual add or to paste JSON
                let manualAddButton = createButton("Manual Add", function() {
                    popup.removeChild(popupButtons);
                    popup.appendChild(manualAddEdit(bookClub, isCreating, true));
                });
                manualAddButton.className = "wk-button--default";
                let pasteJSONButton = createButton("Paste JSON", function() {
                    popup.removeChild(popupButtons);
                    popup.appendChild(pasteJSON());
                });
                pasteJSONButton.className = "wk-button--default";
                let popupButtons = document.createElement('div');
                popupButtons.className = "popup-buttons";
                popupButtons.append(manualAddButton, pasteJSONButton);
                popup.append(popupTitle, popupButtons);
            } else {
                popup.append(popupTitle, manualAddEdit(bookClub, isCreating));
            }

            document.body.appendChild(backgroundOverlay);
        }

        // ------------------ MAIN SCRIPT ------------------
        // Create WK Book Club panel
        let container = document.createElement('div');
        container.id = "book-clubs-container";
        // Create a button to add a new book club
        let newClubButton = createButton("Add Book Club", function() {
            showBookClubEditPopup(true, null);
        });

        let bookClubsList = createPanelBody("book-clubs-list");
        container.append(createPanelHeader("Book Club Tracker", newClubButton), bookClubsList);
        document.querySelector(".dashboard .srs-progress").after(container);

        bookClubs.forEach(bookClub => { // Loop over each book club and add it to the book clubs list
            let bookClubPanel = createBookClubPanel(bookClub);
            bookClubsList.appendChild(bookClubPanel);
        });
        if(bookClubs.length === 0) { // If there are no book clubs, add a message
            let noBookClubsMessage = document.createElement('h2');
            noBookClubsMessage.innerHTML = "No book clubs added yet.";
            bookClubsList.appendChild(noBookClubsMessage);
        }

    } else if(location.href.includes("community")) {
        let oldHref = document.location.href;
        // Create a mutation observer
        const observer = new MutationObserver (mutations => {
            // Check if the href has changed
            if (oldHref !== document.location.href) {
                // Update the old href
                oldHref = document.location.href;
                // Delay by 500ms
                setTimeout (checkPage, 200);
            }
        });
        observer.observe (document.querySelector ('body'), { childList: true, subtree: true });
        // Also call event on page load
        checkPage();

        // Check if the current page is a book club page
        function checkPage() {
            if(!location.pathname.includes("/t")) return;
             // Loop through spans with class .category-name to check if the current page has category "Book Clubs"
            let categorySpans = document.querySelectorAll(".category-name");
            for(let i = 0; i < categorySpans.length; i++) {
                if(categorySpans[i].innerHTML === "Book Clubs") {
                    if(!bookClubs) bookClubs = loadBookClubs();
                    addBookClubButton();
                    break;
                }
            }
        }

        // Add a button to the right of .title-wrapper > h1 to add a book club based on current page
        function addBookClubButton() {
            let titleWrapper = document.querySelector("#topic-title .title-wrapper");
            if(titleWrapper === null) return; // If titleWrapper doesn't exist, return (to avoid errors
            else if(titleWrapper.querySelector(".add-book-club-button") !== null) return; // If button already exists, return (to avoid adding multiple buttons
            else titleWrapper = titleWrapper.querySelector("h1"); // Otherwise, set titleWrapper to the h1 element
            // Create and add styles to page as long as it hasn't already been added
            if(document.querySelector("#add-book-club-button-style") === null) {
                let style2 = document.createElement('style');
                style2.id = "add-book-club-button-style";
                style2.innerHTML += ".add-book-club-button { background-color: transparent; padding: 10px; margin-left: 10px !important; cursor: pointer; font-size: small; vertical-align: middle; border: 1px solid #515151; }"; // Add book club button
                style2.innerHTML += ".edit-popup { padding: 15px; background-color: var(--tertiary-200); position: relative; } .edit-popup button { background-color: transparent }";
                style2.innerHTML += ".edit-popup .close-button { position: absolute; top: 10px; right: 10px; background: transparent; border: none; font-size: large; }";
                style2.innerHTML += ".edit-popup #weeksInfo form {display: flex; align-items: center; column-gap: 10px; } .edit-popup #weeksInfo form:get-child(2) { margin-right: 20px; } .edit-popup #weeksInfo form hr { width: 0 !important; }"; // Weeks info form alignment
                style2.innerHTML += ".edit-popup #totalPages { margin-bottom: 20px } .edit-popup #weeksInfo { background-color: var(--tertiary-100); padding: 10px; }";
                style2.innerHTML += ".edit-popup #weeksInfo li button { color: gray; border: none; } .edit-popup #weeksInfo li button::before { content: 'X'; } .edit-popup #weeksInfo form button::before { content: '+'; }"; // Popup weeks info form button and input
                document.head.appendChild(style2);
            }

            // Add button to page
            let addBookClubButton = createButton("Add Book Club", function() {
                showCommunityBookClubAddPopup();
            });
            addBookClubButton.className = "add-book-club-button";
            titleWrapper.appendChild(addBookClubButton);
        }

        // Create a popup menu to add a book club
        function showCommunityBookClubAddPopup() {
            let parentDiv = document.querySelector("#main-outlet > .regular.ember-view");
            let popup = document.createElement('div');
            popup.className = "edit-popup";

            let popupTitle = document.createElement('h2');
            popupTitle.innerHTML = "Add Book Club";

            let closeButton = createButton("x", function() {
                parentDiv.removeChild(popup);
            });
            closeButton.className = "close-button";

            // Get the book club title from the page and try to remove common book club words
            let bookTitle = document.querySelector(".title-wrapper").querySelector("h1 > a").textContent;
            let wordsToRemove = ["thread", "(Absolute Beginner Book Club)", "(Beginner Book Club)", "(Intermediate Book Club)", "(Advanced Book Club)", "absolute beginner book club", "beginner book club", "intermediate book club", "advanced book club", "(ABBC)", "(BBC)", "(IBC)", "book club", "club"];
            wordsToRemove.forEach(word => {
                word = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                bookTitle = bookTitle.replace(new RegExp(`${word}`, 'ig'), "");
            });
            bookTitle = bookTitle.replace(/\s{2,}/g, " ");
            bookTitle = bookTitle.trim();

            // Loop through all a tags in .regular.contents .cooked and find the first one which has a link to a google sheet or google docs
            let vocabListUrl = "";
            let vocabListLinks = document.querySelectorAll(".regular.contents .cooked a");
            for(let i = 0; i < vocabListLinks.length; i++) {
                if(vocabListLinks[i].href.includes("docs.google.com") || vocabListLinks[i].href.includes("sheets.google.com")) {
                    vocabListUrl = vocabListLinks[i].href;
                    break;
                }
            }

            // Try and get the weeks info from the table in the main post
            let totalPages = 0;
            let weeksInfo = [];
            let possibleTables = document.querySelectorAll(".regular.contents .cooked .md-table table");
            for(let i = 0; i < possibleTables.length; i++) {
                let table = possibleTables[i];
                let tableRows = table.querySelectorAll("tr");
                let isScheduleTable = false;
                let tableHeaders = tableRows[0].querySelectorAll("th");
                for(let j = 0; j < tableHeaders.length; j++) {
                    if(tableHeaders[j].innerHTML.toLowerCase().includes("week") || tableHeaders[j].innerHTML.toLowerCase().includes("chapter")) {
                        isScheduleTable = true;
                        break;
                    }
                }
                if(tableRows.length > 0 && isScheduleTable) {
                    let startDateIndex = null, startPageIndex = null;
                    tableRows[0].querySelectorAll("th").forEach((th, index) => {
                        if(startDateIndex == null && th.innerHTML.toLowerCase().includes("date")) startDateIndex = index;
                        else if(startPageIndex == null && th.innerHTML.toLowerCase().includes("page") && !th.innerHTML.toLowerCase().includes("count") && !th.innerHTML.toLowerCase().includes("total")) startPageIndex = index;
                    });

                    if(startDateIndex == null || startPageIndex == null) break;
                    for(let j = 0; j < tableRows.length; j++) {
                        let tableCells = tableRows[j].querySelectorAll("td");
                        if(tableCells.length > 0 && tableCells[startDateIndex].innerText !== "" && tableCells[startPageIndex].innerText !== "") {
                            let startDateText = tableCells[startDateIndex].innerText.replace("st", "").replace("nd", "").replace("rd", "").replace("th", "").replace("of", "");
                            if(!startDateText.match(/\d{4}/)) startDateText += " " + new Date().getFullYear();
                            let startDate = new Date(startDateText);
                            let weekInfo = {
                                completed: false,
                                startPage: parseInt(tableCells[startPageIndex].innerHTML.match(/\d+/)[0]),
                                startDate: startDate.toLocaleDateString("en-CA").substring(0, 10)
                            };
                            weeksInfo.push(weekInfo);
                            // Set total pages to the last number in tableCells[startPageIndex].innerHTML using regex to find it
                            if(j === tableRows.length - 1) {
                                let totalPagesMatch = tableCells[startPageIndex].innerHTML.match(/\d+$/);
                                if(totalPagesMatch) totalPages = parseInt(totalPagesMatch[0]);
                            }
                        }
                    }
                    break;
                }
            }

            // Create a book club object and add create a popup form to edit it
            let newBookClub = {
                title: bookTitle,
                url: location.href,
                vocabListUrl: vocabListUrl,
                totalPages: totalPages,
                weeksInfo: weeksInfo,
                active: true
            };
            let popupForm = manualAddEdit(newBookClub, false, true);
            popup.append(popupTitle, closeButton, popupForm);

            parentDiv.insertBefore(popup, parentDiv.querySelector(".posts"));
        }
    }
})();