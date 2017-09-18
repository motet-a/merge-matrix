'use strict'

document
    .querySelectorAll('time')
    .forEach(element => {
        const datetime = element.getAttribute('datetime')
        if (datetime) {
            element.textContent = (new Date(datetime)).toString()
        }
    })
