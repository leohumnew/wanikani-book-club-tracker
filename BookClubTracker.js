// ==UserScript==
// @name         Book Club Tracker
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Add a panel to the WK Readers page to track book club progress
// @author       leohumnew
// @match        https://www.wanikani.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ------------------ HELPER FUNCTIONS ------------------
    function createButton(text, clickHandler) { // Create a button with the given text and click handler
        let button = document.createElement('button');
        button.innerHTML = text;
        button.addEventListener("click", clickHandler);
        return button;
    }

    // ------------------ MAIN SCRIPT ------------------
    // ----- DASHBOARD -----
    if (location.pathname == "/dashboard" || location.pathname == "/") {

        // Create and add styles to page
        let style = document.createElement('style');
        style.innerHTML += ".dashboard section.lessons-and-reviews li { margin-right: 20px; }";
        style.innerHTML += ".book-club-button { background-color: var(--color-dashboard-panel-background); border: none; transition: 0.2s; }";
        document.head.appendChild(style);
        
        // Add button to take user to /readers page, which says "Book Clubs", as a child to class .lessons-and-reviews
        let parentElement = document.querySelector(".lessons-and-reviews ul");
        let newButtonLi = document.createElement('li');
        newButtonLi.style = "flex-basis: 170px";
        let newButton = createButton("Book Clubs", function() {
            location.href = "/readers";
        });
        newButton.className = "lessons-and-reviews__button book-club-button";
        newButtonLi.appendChild(newButton);
        parentElement.prepend(newButtonLi);
        
    // ----- READERS -----
    } else if (location.pathname == "/readers") {

        let bookClubs = loadBookClubs();

        // Create and add styles to page
        let style = document.createElement('style');
        style.innerHTML += ".book-clubs-list { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 30px; padding: 12px; margin-bottom: 80px; background-color: var(--color-dashboard-panel-background); --color-correct-light: color-mix(in srgb, var(--color-correct) 50%, white); --color-incorrect-light: color-mix(in srgb, var(--color-incorrect) 50%, white); }";
        style.innerHTML += ".book-club { background-color: var(--color-dashboard-panel-content-background); border-radius: 7px; padding: 12px; width: 100%; }";
        style.innerHTML += ".book-club .reader-summary__title { font-size: 1.5rem; }";
        style.innerHTML += ".book-club .delete-club-button { margin-left: auto; background: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-mid); }";
        style.innerHTML += ".book-club-weeks { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: initial; gap: 15px; margin-top: 15px; }";
        style.innerHTML += ".book-club-week { background-color: var(--color-dashboard-panel-background); border-radius: 4px; padding: 12px; }";
        style.innerHTML += ".book-club-week--missed h3 { font-weight: 600; color: color-mix(in srgb, var(--color-incorrect-light) 50%, #0000); }";
        style.innerHTML += ".book-club-week--completed h3 { font-weight: 600; color: color-mix(in srgb, var(--color-correct-light) 50%, #0000); }";
        style.innerHTML += ".book-club-week--active { font-weight: 600; border: 1px solid var(--color-tertiary); }";
        style.innerHTML += ".book-club-week--inactive { filter: opacity(0.5); }";
        style.innerHTML += ".edit-popup { background-color: var(--color-menu); border-radius: 7px; padding: var(--spacing-loose); width: 50%; height: 50%; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); }";
        style.innerHTML += ".edit-popup h2 { text-align: center; font-size: 2rem; margin-bottom: var(--spacing-loose); }";
        style.innerHTML += ".edit-popup__form > input { margin-bottom: var(--spacing-tight); margin-left: var(--spacing-loose); padding: 3px; border-radius: 4px; }";
        style.innerHTML += ".edit-popup__form input:focus { outline: 1px solid var(--color-tertiary); }";
        style.innerHTML += ".edit-popup__form > label { font-weight: 600; }";
        style.innerHTML += ".edit-popup #weeksInfo { background-color: var(--color-dashboard-panel-content-background); padding: 15px; border-radius: 7px; margin: 10px 0; }";
        style.innerHTML += ".edit-popup #weeksInfo form { display: flex; flex-direction: row; flex-wrap: wrap; justify-content: space-between; gap: 15px; }";
        style.innerHTML += ".edit-popup__form > button { margin: auto; cursor: pointer; width: 100%; }";
        document.head.appendChild(style);

        // Get book club helper function
        function getBookClub(title) {
            return bookClubs.find(bookClub => bookClub.title === title);
        }

        // Create a panel header
        function createPanelHeader(text, button) {
            let panelTitle = document.createElement('div');
            panelTitle.className = "page-header";
            let panelTitleText = document.createElement('h1');
            panelTitleText.innerHTML = text;
            panelTitleText.className = "page-header__title";
            panelTitle.appendChild(panelTitleText);
            // If a button was passed in, add it to the right of the h1 element
            if (button) {
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

        // Create a book club panel
        function createBookClubPanel(bookClubInfo) {
            let bookClubPanel = document.createElement('div'); // Create a div for the book club panel
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
            bookClubSubTitle.innerHTML += bookClubInfo.active ? "<span style='color: var(--color-correct)'>Active</span>" : "<span style='color: var(--color-incorrect)'>Inactive</span>";

            let bookClubWeeks = document.createElement('div'); // Create a div for each week and its info
            bookClubWeeks.className = "book-club-weeks";
            for (let i = 0; i < bookClubInfo.weeksInfo.length; i++) { // Loop over each week
                let week = document.createElement('div'); // Create a div for the week and add a click handler to toggle the week's complete status
                week.className = "book-club-week";
                week.addEventListener("click", function() {
                    toggleBookClubWeek(bookClubInfo.title, i + 1);
                    location.reload();
                });
                
                let weekTitle = document.createElement('h3'); // Create a title and info for the week
                weekTitle.innerHTML = "Week " + (i + 1);

                let weekInfo = document.createElement('p');
                weekInfo.innerHTML = "Pages: " + bookClubInfo.weeksInfo[i].startPage + " - " + bookClubInfo.weeksInfo[i].endPage;
                weekInfo.innerHTML += "<br>Start Date: " + new Date(bookClubInfo.weeksInfo[i].startDate).toLocaleDateString();

                // Set week class depending on date and "complete" field, to either inactive (if start date is in the future, can be set to complete as well), or active (if current date is after startDate and before next week startDate), or missed (if current date is after next week startDate and week is not complete), or completed (if week is complete)
                let today = new Date();
                let nextWeekStartDate = i < bookClubInfo.weeksInfo.length - 1 ? new Date(bookClubInfo.weeksInfo[i + 1].startDate) : null;
                if (bookClubInfo.weeksInfo[i].completed) {
                    week.className += " book-club-week--completed"; }

                if (today < new Date(bookClubInfo.weeksInfo[i].startDate)) {
                    week.className += " book-club-week--inactive";
                } else if (nextWeekStartDate && today >= nextWeekStartDate && !bookClubInfo.weeksInfo[i].completed) {
                    week.className += " book-club-week--missed";
                } else if (nextWeekStartDate && today >= new Date(bookClubInfo.weeksInfo[i].startDate) && today < nextWeekStartDate) {
                    week.className += " book-club-week--active";
                }
                
                week.append(weekTitle, weekInfo); // Append the title and info to the week div
                bookClubWeeks.appendChild(week);
            }

            bookClubPanel.append(bookClubHeader, bookClubSubTitle, bookClubWeeks); // Append the header, subtitle and weeks to the book club panel
            return bookClubPanel;
        }

        // Load, save, add and delete book clubs from local storage
        function loadBookClubs() {
            let loadedBookClubs = localStorage.getItem("WaniKaniBookClubs");
            if (loadedBookClubs) {
                return JSON.parse(loadedBookClubs);
            } else {
                return [];
            }
        }
        function saveBookClubs() {
            localStorage.setItem("WaniKaniBookClubs", JSON.stringify(bookClubs));
        }
        function addBookClub(title, url, weeksInfo, vocabListUrl) {
            bookClubs.push({
                title: title,
                url: url,
                weeksInfo: weeksInfo,
                vocabListUrl: vocabListUrl,
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

        // Create a popup menu to add / edit a book club
        function showBookClubEditPopup(isCreating, bookClubName) {
            let bookClub = isCreating ? null : getBookClub(bookClubName);

            let popup = document.createElement('div');
            popup.className = "edit-popup";

            let popupTitle = document.createElement('h2');
            popupTitle.innerHTML = isCreating ? "Add Book Club" : "Edit Book Club";

            // Create a container for all the text inputs, then add them with an html string to the popupForm's innerHTML
            let popupForm = document.createElement('div');
            popupForm.className = "edit-popup__form";
            popupForm.innerHTML = isCreating ? "<label for='title'>Title</label><input type='text' id='title' name='title' placeholder='Title' required>" : "<label for='title'></label><h3 id='title'>" + bookClub.title + "</h2>";
            popupForm.innerHTML += `
                <br><label for='url'>Main Thread URL</label><input type='text' id='url' name='url' placeholder='URL' required><br>
                <label for='vocabListUrl'>Vocab List URL</label><input type='text' id='vocabListUrl' name='vocabListUrl' placeholder='URL' required><br>
                <label for='weeksInfo'>Weeks Info</label>
            `;
            let weeksInfoContainer = document.createElement('div');
            weeksInfoContainer.id = "weeksInfo";
            popupForm.appendChild(weeksInfoContainer);
            let saveButton = createButton("Save", function() {
                if (isCreating) {
                    addBookClub(
                        document.querySelector("#title").value,
                        document.querySelector("#url").value,
                        weeksInfo,
                        document.querySelector("#vocabListUrl").value
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
            saveButton.className = "wk-button--default";
            popupForm.appendChild(saveButton);

            // Set up weeks info content
            let weeksInfo = isCreating ? [] : bookClub.weeksInfo;
            let newWeekForm = document.createElement('form'); // Create week adding form
            newWeekForm.innerHTML = `
                <label for='startPage'>Start Page</label><input type='number' id='startPage' name='startPage' placeholder='Start Page' required>
                <label for='endPage'>End Page</label><input type='number' id='endPage' name='endPage' placeholder='End Page' required>
                <label for='startDate'>Start Date</label><input type='date' id='startDate' name='startDate' placeholder='Start Date' required>
                <button type='submit'>+</button>
                <hr style="width: 100%;">
            `;
            newWeekForm.addEventListener("submit", function(e) {
                e.preventDefault();
                let newWeekInfo = { // Create new week info object, and add it to weeksInfo in the correct position according to start date (with week 1 at the start of the array)
                    completed: false,
                    startPage: document.querySelector("#startPage").value,
                    endPage: document.querySelector("#endPage").value,
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
                weekElement.innerHTML = "Week " + (index + 1) + " - Pages: " + newWeekInfo.startPage + " - " + newWeekInfo.endPage + " - Start Date: " + new Date(newWeekInfo.startDate).toLocaleDateString();
                let deleteWeekButton = createButton("", function() { // Create delete button
                    weeksInfo.splice(index, 1);
                    weeksInfoList.removeChild(weekElement);
                });
                deleteWeekButton.className = "delete-week-button wk-icon fa-regular fa-times";
                weekElement.appendChild(deleteWeekButton);
                weeksInfoList.insertBefore(weekElement, weeksInfoList.childNodes[index]);

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
            popup.append(popupTitle, popupForm);
            document.body.appendChild(popup);
        }

        // Wait for page and turbo to finish loading, by waiting for the turbo:load event
        document.addEventListener("turbo:load", function() {
            runScript();
        });

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

            // Get the list of book clubs from local storage, then loop over them creating a book club panel for each
            bookClubs.forEach(bookClub => {
                let bookClubPanel = createBookClubPanel(bookClub);
                bookClubsList.appendChild(bookClubPanel);
            });
        }
    }
})();