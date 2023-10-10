// ==UserScript==
// @name         Book Club Tracker
// @namespace    http://tampermonkey.net/
// @version      0.1
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
    // Check if we're on the /readers or dashboard page
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
        document.head.appendChild(style);

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
            let bookClubPanel = document.createElement('div');
            bookClubPanel.className = "book-club";

            let bookClubHeader = document.createElement('div');
            bookClubHeader.style.display = "flex";
            let bookClubTitle = document.createElement('a');
            bookClubTitle.className = "reader-summary__title";
            bookClubTitle.href = bookClubInfo.url;
            bookClubTitle.target = "_blank";
            bookClubTitle.innerHTML = bookClubInfo.title;
            let deleteButton = createButton("X", function() {
                if (confirm("Are you sure you want to delete this book club?")) deleteBookClub(bookClubInfo.title);
                location.reload();
            });
            deleteButton.className = "delete-club-button";
            bookClubHeader.append(bookClubTitle, deleteButton);

            let bookClubSubTitle = document.createElement('span');
            bookClubSubTitle.className = "reader-summary__status";
            bookClubSubTitle.innerHTML = "<a target='_blank' href='" + bookClubInfo.vocabListUrl + "'>Vocab List</a> | ";
            bookClubSubTitle.innerHTML += bookClubInfo.active ? "<span style='color: var(--color-correct)'>Active</span>" : "<span style='color: var(--color-incorrect)'>Inactive</span>";

            // Create a div for each week and its info
            let bookClubWeeks = document.createElement('div');
            bookClubWeeks.className = "book-club-weeks";
            for (let i = 0; i < bookClubInfo.weeksInfo.length; i++) {
                let week = document.createElement('div');
                week.className = "book-club-week";
                week.addEventListener("click", function() {
                    toggleBookClubWeek(bookClubInfo.title, i + 1);
                    location.reload();
                });
                
                let weekTitle = document.createElement('h3');
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
                
                week.append(weekTitle, weekInfo);
                bookClubWeeks.appendChild(week);
            }

            bookClubPanel.append(bookClubHeader, bookClubSubTitle, bookClubWeeks);
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
            let bookClub = bookClubs.find(bookClub => bookClub.title === bookClubTitle);
            bookClub.weeksInfo[weekNumber - 1].completed = !bookClub.weeksInfo[weekNumber - 1].completed;
            saveBookClubs();
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
                let title = prompt("Enter the title of the book club");
                let url = prompt("Enter the URL of the main thread");
                let vocabListUrl = prompt("Enter the URL of the vocab list");
                let weeksInfo = [];
                let weekNumber = 1;
                while (true) {
                    let startPage = prompt("Enter the start page of week " + weekNumber + " (or leave blank to stop)");
                    if (startPage === "") {
                        break;
                    }
                    let endPage = prompt("Enter the end page of week " + weekNumber);
                    let startDate = null;
                    while(startDate == null) startDate = new Date(prompt("Enter the start date of week " + weekNumber));
                    weeksInfo.push({
                        completed: false,
                        startPage: startPage,
                        endPage: endPage,
                        startDate: startDate
                    });
                    weekNumber++;
                }
                addBookClub(title, url, weeksInfo, vocabListUrl);
                location.reload();
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