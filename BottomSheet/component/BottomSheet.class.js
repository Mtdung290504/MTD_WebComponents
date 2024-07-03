!!!function(){
    /**
     * @extends {HTMLElement}
     */
    class BottomSheet extends HTMLElement {
        constructor() {
            super();

            // Create shadow DOM
            this.shadow = this.attachShadow({ mode: 'open' });

            // Create sub elements
            const [
                overlay, bottomSheet,
                header, dragIndicator,
                content
            ] = [
                'bottom-sheet-overlay', 'bottom-sheet',
                'bottom-sheet-header', 'drag-indicator',
                'bottom-sheet-content'
            ].map(className => {
                const div = document.createElement('div');
                div.classList.add(className);
                return div;
            });

            // To ensure that the content of the bottom sheet will not appear until the style has finished loading
            bottomSheet.style.opacity = '0';

            content.appendChild(document.createElement('slot'));

            // Append drag indicators to header
            header.appendChild(dragIndicator);

            // Append header and content to bottom sheet
            bottomSheet.appendChild(header);
            bottomSheet.appendChild(content);

            // Append overlay and bottom sheet to shadow DOM
            this.shadow.appendChild(overlay);
            this.shadow.appendChild(bottomSheet);

            // Assign child elements to this to use
            this.bottomSheet = bottomSheet;
            this.header = header;
            this.overlay = overlay;

            // Dismiss bottom sheet when click in overlay
            this.overlay.addEventListener('click', () => this.dismiss());

            // Load CSS
            const preloadLink = document.querySelector('link[rel="preload"][href$="bottom-sheet.default-style.css"]');
            const CSS_PATH = preloadLink ? preloadLink.href : undefined;

            if(CSS_PATH != undefined)
                this.#loadCSS(CSS_PATH);
            else
                throw new Error('Default CSS resource for BottomSheet not found');
        }

        async #loadCSS(cssPath) {
            try {
                const response = await fetch(cssPath);
                const css = await response.text();
                const style = document.createElement('style');
                style.textContent = css;
                this.shadow.appendChild(style);
                this.bottomSheet.style.opacity = '1';
            } catch (error) {
                console.error('Failed to load CSS:', error);
            }
        }

        show() {
            this.overlay.style.display = 'block';
            this.bottomSheet.style.bottom = '0';
            this.bottomSheet.style.height = this.#getCSSVariable('--normal-height');
            this.setAttribute('open', '');
            history.pushState(null, null, location.href);
        }

        dismiss(back = true) {
            this.bottomSheet.addEventListener('transitionend', () => {
                this.removeAttribute('full');
            }, {
                once: true
            })
            this.bottomSheet.style.bottom = '-100%';
            this.overlay.style.display = 'none';
            this.removeAttribute('open');
            
            if(back)
                history.back();
        }

        #getCSSVariable(property) {
            return getComputedStyle(this.shadow.host).getPropertyValue(property).trim();
        }

        connectedCallback() {
            let startY, startHeight;
            const { header, bottomSheet } = this;
            const _this = this;

            header.addEventListener('mousedown', onMouseDown);
            header.addEventListener('touchstart', onTouchStart);

            /**
             * @param {MouseEvent} event 
             */
            function onMouseDown(event) {
                event.preventDefault();
                startY = event.clientY;
                startHeight = bottomSheet.clientHeight;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        
            /**
             * @param {TouchEvent} event 
             */
            function onTouchStart(event) {
                event.preventDefault();
                startY = event.touches[0].clientY;
                startHeight = bottomSheet.clientHeight;
                document.addEventListener('touchmove', onTouchMove);
                document.addEventListener('touchend', onTouchEnd);
            }
        
            /**
             * @param {MouseEvent} event 
             */
            function onMouseMove(event) {
                const currentY = event.clientY;
                handleMove(currentY);
            }
        
            /**
             * @param {TouchEvent} event 
             */
            function onTouchMove(event) {
                const currentY = event.touches[0].clientY;
                handleMove(currentY);
            }
        
            function handleMove(currentY) {
                const dy = currentY - startY;
                bottomSheet.style.height = `${Math.max(startHeight - dy, 0)}px`;
            }

            /**
             * @param {MouseEvent} event 
             */
            function onMouseUp(event) {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                const currentY = event.clientY;
                handleUp(currentY);
            }
        
            /**
             * @param {TouchEvent} event 
             */
            function onTouchEnd(event) {
                const currentY = event.changedTouches[0].clientY;
                handleUp(currentY);
            }
        
            function handleUp(currentY) {
                const dy = currentY - startY;
                const bottomSheetNormalHeightCSS = _this.#getCSSVariable('--bottom-sheet-normal-height');
                const normalHeight = screen.height * 0.01 * parseInt(bottomSheetNormalHeightCSS);
                const dHeight = bottomSheet.clientHeight;
        
                if (dy < - (screen.height * .04) && dHeight > normalHeight) {
                    _this.setAttribute('full', '');
                } else if (dy > screen.height * .04) {
                    if(dHeight > normalHeight * 1.6) {
                        _this.setAttribute('full', '');
                    } else {
                        _this.dismiss();
                    }
                } else {
                    if(!Math.abs(dy) <= 5) {
                        if(Math.abs(dHeight - normalHeight * 1.5) > 0) {
                            _this.#toggleFullState();
                            _this.#toggleFullState();                            
                        }
                    }
                }
                
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            }

            window.addEventListener('popstate', () => {
                if (this.hasAttribute('open')) {
                    this.dismiss(false);
                }
            });
        }

        static get observedAttributes() {
            return ['full'];
        }

        #toggleFullState() {
            this.toggleAttribute('full');
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (name === 'full') {
                if (this.hasAttribute('full')) {
                    this.#fullHeight();
                } else {
                    this.#normalHeight();
                }
            }
        }

        #fullHeight() {
            const transitionTime = this.#getCSSVariable('--transition-time');

            this.bottomSheet.style.transition = `height ${transitionTime}`;
            this.bottomSheet.style.height = '100%';

            this.bottomSheet.addEventListener('transitionend', () => {
                this.bottomSheet.style.transition = `bottom ${transitionTime}`;
            }, {
                once: true
            });
        }

        #normalHeight() {
            const transitionTime = this.#getCSSVariable('--transition-time');

            this.bottomSheet.style.transition = `height ${transitionTime}`;
            this.bottomSheet.style.height = this.#getCSSVariable('--bottom-sheet-normal-height');

            this.bottomSheet.addEventListener('transitionend', () => {
                this.bottomSheet.style.transition = `bottom ${transitionTime}`;
            }, {
                once: true
            });
        }
    }

    customElements.define('bottom-sheet', BottomSheet);
}()