'use strict'

document
    .querySelectorAll('time')
    .forEach(element => {
        const datetime = element.getAttribute('datetime')
        if (datetime) {
            element.textContent = (new Date(datetime)).toString()
        }
    })

const tooltipContainer = document.querySelector('#tooltips-container')

document
    .querySelectorAll('[title]')
    .forEach(element => {
        const title = element.getAttribute('title')
        if (!title) {
            return
        }

        element.removeAttribute('title')

        new Tooltip(element, {
            title,
            container: tooltipContainer,
            popperOptions: {
                modifiers: {
                    computeStyle: {
                        gpuAcceleration: false,
                    },
                }
            },
        })
    })
