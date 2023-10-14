// ==UserScript==
// @name         WK Book Club Tracker
// @namespace    http://tampermonkey.net/
// @version      0.3.4
// @description  Add a panel to the WK Readers page to track book club progress
// @author       leohumnew
// @match        https://www.wanikani.com/*
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
        4. Main script */

    // ------------------ HELPER FUNCTIONS ------------------
    function createButton(text, clickHandler) { // Create a button with the given text and click handler
        let button = document.createElement('button');
        button.innerHTML = text;
        button.addEventListener("click", clickHandler);
        return button;
    }

    // ------------------ DASHBOARD ------------------
    if (location.pathname == "/dashboard" || location.pathname == "/") {

        // Create and add styles to page
        let style = document.createElement('style');
        style.innerHTML += ".dashboard section.lessons-and-reviews li { margin-right: 20px; }";
        style.innerHTML += ".book-club-button { background-color: var(--color-dashboard-panel-background); border: none; transition: 0.2s; color: var(--color-text) }";
        style.innerHTML += ".book-club-button:hover { color: var(--color-text); }";
        document.head.appendChild(style);

        // Add button to take user to /readers page, which says "Book Clubs", as a child to class .lessons-and-reviews
        let parentElement = document.querySelector(".lessons-and-reviews ul");
        let newButtonLi = document.createElement('li');
        newButtonLi.style = "flex-basis: 170px";
        let newButton = createButton("Book Clubs", function() {
            location.href = "/readers";
        });
        newButton.className = "lessons-and-reviews__button lessons-and-reviews__reviews-button--50 book-club-button";
        newButtonLi.appendChild(newButton);
        parentElement.prepend(newButtonLi);

    // ------------------ READERS ------------------
    } else if (location.pathname == "/readers") {

        let bookClubs = loadBookClubs();

        // Create and add styles to page
        let style = document.createElement('style');
        style.innerHTML += ".book-clubs-list { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 30px; padding: 12px; margin-bottom: 80px; background-color: var(--color-dashboard-panel-background); } :root {--color-correct-light: color-mix(in srgb, var(--color-correct, #18811d), white); --color-incorrect-light: color-mix(in srgb, var(--color-incorrect, #811818), white); --color-tertiary-fix: var(--color-tertiary, #3b97f1); --color-menu-fix: var(--color-menu, #f5f5f5); }";
        style.innerHTML += ".book-club { background-color: var(--color-dashboard-panel-content-background); border-radius: 7px; padding: 12px; width: 100%; }";
        style.innerHTML += ".book-club .reader-summary__title { font-size: 1.5rem; }";
        style.innerHTML += ".book-club .reader-summary__status button { text-decoration: underline; cursor: pointer; background: none; }"; // Book club active/inactive button
        style.innerHTML += ".book-club .reader-summary__status button:hover, .book-club .reader-summary__status a:hover { color: var(--color-tertiary-fix) !important; }"; // Book club active/inactive button and vocab sheet button hover
        style.innerHTML += ".book-club .delete-club-button { margin-left: auto; background: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-mid); } .book-club .delete-club-button:hover { color: var(--color-tertiary-fix); }"; // Delete book club button
        style.innerHTML += ".book-club-weeks { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 15px; margin-top: 15px; }";
        style.innerHTML += ".book-club-week { background-color: var(--color-dashboard-panel-background); border-radius: 4px; padding: 12px 16px; cursor: pointer; }";
        style.innerHTML += ".book-club-week:hover { outline: 1px dashed var(--color-tertiary-fix); }";
        style.innerHTML += ".book-club-week--missed h3 { font-weight: 600; color: var(--color-incorrect-light); }";
        style.innerHTML += ".book-club-week--completed h3 { font-weight: 600; color: var(--color-correct-light); }";
        style.innerHTML += ".book-club-week--active { font-weight: 600; border: 1px solid var(--color-tertiary-fix); } .book-club-week--active p { font-weight: normal; }";
        style.innerHTML += ".book-club-week--inactive { filter: opacity(0.5); }";
        style.innerHTML += ".background-overlay { background-color: rgba(0,0,0,0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 100; }";
        style.innerHTML += ".edit-popup { background-color: var(--color-menu-fix); border-radius: 7px; padding: var(--spacing-loose); width: 50%; height: 50%; position: fixed; top: 50%; left: 50%; transform: translate(-50.12%, -50.12%); overflow-y: scroll; }";
        style.innerHTML += ".edit-popup h2 { text-align: center; font-size: 2rem; margin-bottom: var(--spacing-loose); }";
        style.innerHTML += ".edit-popup .popup-buttons { width: fit-content; position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%) } .edit-popup .popup-buttons button { margin: 0 10px; font-size: var(--font-size-large); cursor: pointer; }"; // Popup add/edit buttons
        style.innerHTML += ".edit-popup__form > textarea { margin-bottom: var(--spacing-tight); margin-top: var(--spacing-tight); padding: 3px; border-radius: 4px; width: 100%; height: 200px; resize: none; }"; // Popup form textarea for JSON input
        style.innerHTML += ".edit-popup__form > input { margin-bottom: var(--spacing-tight); margin-left: var(--spacing-loose); padding: 3px; border-radius: 4px; background-color: var(--color-dashboard-panel-content-background); }"; // Popup form input
        style.innerHTML += ".edit-popup__form input:focus { outline: 1px solid var(--color-tertiary-fix); }";
        style.innerHTML += ".edit-popup__form > label { font-weight: 600; }";
        style.innerHTML += ".edit-popup #weeksInfo { background-color: var(--color-dashboard-panel-content-background); padding: 15px; border-radius: 7px; margin: 10px 0; } #weeksInfo li { margin-bottom: 5px; }"; // Popup weeks info
        style.innerHTML += ".edit-popup #weeksInfo form { display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; gap: 15px; }"; // Popup weeks info form for adding weeks
        style.innerHTML += ".edit-popup #weeksInfo form button { padding: 3px; border-radius: 4px; cursor: pointer; margin-left: auto; } .edit-popup #weeksInfo ul button { padding: 3px; border-radius: 4px; cursor: pointer; margin-left: 10px; } #weeksInfo input { padding: 3px; border-radius: 4px; background-color: var(--color-menu-fix); }"; // Popup weeks info form button and input
        style.innerHTML += ".edit-popup__form > button { margin: auto; cursor: pointer; width: 100%; }"; // Popup save button
        document.head.appendChild(style);

        // Get a specific book club from the list of book clubs by name
        function getBookClub(title) {
            return bookClubs.find(bookClub => bookClub.title === title);
        }

        // Create the header for a "panel" (section with title + content)
        function createPanelHeader(text, button) {
            let panelTitle = document.createElement('div');
            panelTitle.className = "page-header";
            let panelTitleText = document.createElement('h1');
            panelTitleText.innerHTML = text;
            panelTitleText.className = "page-header__title";
            panelTitle.appendChild(panelTitleText);
            if (button) { // If a button was passed in, add it to the right of the h1 element
                button.className += " page-header__additional-info";
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
            bookClubHeader.style.display = "flex";
            let bookClubTitle = document.createElement('a');
            bookClubTitle.className = "reader-summary__title";
            bookClubTitle.href = bookClubInfo.url;
            bookClubTitle.target = "_blank";
            bookClubTitle.innerHTML = bookClubInfo.title;
            let deleteButton = createButton("", function() {
                if (confirm("Are you sure you want to delete this book club?")) deleteBookClub(bookClubInfo.title);
                location.reload();
            });
            deleteButton.className = "delete-club-button wk-icon fa-regular fa-times";
            bookClubHeader.append(bookClubTitle, deleteButton);

            let bookClubSubTitle = document.createElement('span'); // Create the subtitle with the vocab list link and active status
            bookClubSubTitle.className = "reader-summary__status";
            bookClubSubTitle.innerHTML = "<a target='_blank' href='" + bookClubInfo.vocabListUrl + "'>Vocab List</a> | ";
            let activeButton = createButton(bookClubInfo.active ? "Active" : "Inactive", function() {
                bookClubInfo.active = !bookClubInfo.active;
                saveBookClubs();
                location.reload();
            });
            activeButton.style.color += (bookClubInfo.active ? "var(--color-correct-light)" : "var(--color-incorrect-light)");
            bookClubSubTitle.appendChild(activeButton);

            let bookClubWeeks = document.createElement('div'); // Create a container div for the weeks
            bookClubWeeks.className = "book-club-weeks";
            for (let i = 0; i < bookClubInfo.weeksInfo.length; i++) { // Loop over each week and add it to the container
                bookClubWeeks.appendChild(createWeekInfo(bookClubInfo, i));
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
                weekInfo.innerHTML += "<br>Start Date: " + new Date(bookClubInfo.weeksInfo[i].startDate).toLocaleDateString();

                // Set week class depending on date and "complete" field
                let today = new Date();
                let nextWeekStartDate = i < bookClubInfo.weeksInfo.length - 1 ? new Date(bookClubInfo.weeksInfo[i + 1].startDate) : null;
                if (bookClubInfo.weeksInfo[i].completed) { // If week is completed, add completed class and add tick symbol to week title
                    week.className += " book-club-week--completed";
                    weekTitle.innerHTML += " <span class='wk-icon fa-regular fa-check' style='float: right'></span>";
                }

                if (today < new Date(bookClubInfo.weeksInfo[i].startDate)) { // If week is in the future, add inactive class
                    week.className += " book-club-week--inactive";
                } else if (nextWeekStartDate && today >= nextWeekStartDate && !bookClubInfo.weeksInfo[i].completed) { // If week is missed, add missed class and add exclamation symbol to week title
                    week.className += " book-club-week--missed";
                    weekTitle.innerHTML += " <span class='wk-icon fa-regular fa-exclamation' style='float: right'></span>";
                } else if (bookClubInfo.active && today >= new Date(bookClubInfo.weeksInfo[i].startDate) && (!nextWeekStartDate || today < nextWeekStartDate)) { // If week is active, add active class
                    week.className += " book-club-week--active";
                }

                week.append(weekTitle, weekInfo); // Append the title and info to the week div
                return week;
            }

        // ----------- Load, save, add and delete book clubs from userscript storage -----------
        function loadBookClubs() {
            //console.log(GM_getValue("WaniKaniBookClubs", null));
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

        // ------------------ POPUP MENU ------------------
        // Create a popup menu to manually add or edit a book club
        function manualAddEdit(bookClub, isCreating) {
            // Create a container for all the text inputs, then add them with an html string to the popupForm's innerHTML
            let popupForm = document.createElement('form');
            popupForm.className = "edit-popup__form";
            popupForm.innerHTML = isCreating ? "<label for='title'>Title</label><input type='text' id='title' name='title' placeholder='Title' required>" : "<label for='title'></label><h3 id='title'>" + bookClub.title + "</h2>";
            popupForm.innerHTML += `
                <br><label for='url'>Main Thread URL</label><input type='text' id='url' name='url' placeholder='URL' required><br>
                <label for='vocabListUrl'>Vocab List URL</label><input type='text' id='vocabListUrl' name='vocabListUrl' placeholder='URL' required><br>
                <label for='totalPages'>Total Pages</label><input type='number' id='totalPages' name='totalPages' placeholder='Total Pages' required><br>
                <label for='weeksInfo'>Weeks Info</label>
            `;
            let weeksInfoContainer = document.createElement('div');
            weeksInfoContainer.id = "weeksInfo";
            popupForm.appendChild(weeksInfoContainer);
            let saveButton = createButton("Save", null);
            popupForm.addEventListener("submit", function() {
                if (isCreating) {
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
                    startDate: new Date(document.querySelector("#startDate").value)
                };
                let index = weeksInfo.findIndex(week => new Date(week.startDate) > new Date(newWeekInfo.startDate));
                if (index === -1) {
                    weeksInfo.push(newWeekInfo);
                } else {
                    weeksInfo.splice(index, 0, newWeekInfo);
                }

                let weeksInfoList = document.querySelector("#weeksInfo ul");
                let weekElement = document.createElement('li'); // Create new week element, and insert it in weeksInfoList in the correct position
                weekElement.innerHTML = "Week <span></span> - Start Page: " + newWeekInfo.startPage + " - Start Date: " + new Date(newWeekInfo.startDate).toLocaleDateString();
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
                weekElement.innerHTML = "Week " + (i + 1) + " - Pages: " + week.startPage + " - " + week.endPage + " - Start Date: " + new Date(week.startDate).toLocaleDateString();
                let deleteWeekButton = createButton("", function() { // Create delete button for each week
                    weeksInfo.splice(i, 1);
                    weeksInfoList.removeChild(weekElement);
                });
                deleteWeekButton.className = "delete-week-button wk-icon fa-regular fa-times";
                weekElement.appendChild(deleteWeekButton);
                weeksInfoList.appendChild(weekElement);
            }

            weeksInfoContainer.append(newWeekForm, weeksInfoList);
            return popupForm;
        }

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

            if(isCreating) { // If creating, add buttons to choose manual add or to paste JSON
                let manualAddButton = createButton("Manual Add", function() {
                    popup.removeChild(popupButtons);
                    popup.appendChild(manualAddEdit(bookClub, isCreating));
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
                popup.append(popupTitle, manualAddEdit(bookClub));
            }

            document.body.appendChild(backgroundOverlay);
        }

        // ------------------ MAIN SCRIPT ------------------
        runScript();

        // Run the script
        function runScript() {
            // Create WK Book Club panel
            let parentElement = document.querySelector(".site-content-container > .container");
            let oldHeader = parentElement.querySelector(".page-header");

            // Create a button to add a new book club
            let newClubButton = createButton("Add Book Club", function() {
                showBookClubEditPopup(true, null);
            });
            newClubButton.className = "info-popover__button";

            parentElement.insertBefore(createPanelHeader("Book Club Tracker", newClubButton), oldHeader);
            let bookClubsList = createPanelBody("book-clubs-list");
            parentElement.insertBefore(bookClubsList, oldHeader);

            bookClubs.forEach(bookClub => { // Loop over each book club and add it to the book clubs list
                let bookClubPanel = createBookClubPanel(bookClub);
                bookClubsList.appendChild(bookClubPanel);
            });
            if(bookClubs.length === 0) { // If there are no book clubs, add a message
                let noBookClubsMessage = document.createElement('h2');
                noBookClubsMessage.innerHTML = "No book clubs added yet.";
                bookClubsList.appendChild(noBookClubsMessage);
            }
        }
    }
})();