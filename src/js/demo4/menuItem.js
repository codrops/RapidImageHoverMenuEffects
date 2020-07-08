import {gsap} from 'gsap';
import { map, lerp, clamp, getMousePos, getRandomFloat } from '../utils';
const images = Object.entries(require('../../img/demo4/*.jpg'));

// track the mouse position
let mousepos = {x: 0, y: 0};
// cache the mouse position
let mousePosCache = mousepos;
let direction = {x: mousePosCache.x-mousepos.x, y: mousePosCache.y-mousepos.y};

// update mouse position when moving the mouse
window.addEventListener('mousemove', ev => mousepos = getMousePos(ev));

export default class MenuItem {
    constructor(el, inMenuPosition, animatableProperties) {
        // el is the <a> with class "menu__item"
        this.DOM = {el: el};
        // position in the Menu
        this.inMenuPosition = inMenuPosition;
        // menu item properties that will animate as we move the mouse around the menu
        this.animatableProperties = animatableProperties;
        // the item text
        this.DOM.textInner = this.DOM.el.querySelector('.menu__item-textinner');
        // create the image structure
        this.layout();
        // initialize some events
        this.initEvents();
    }
    // create the image structure
    // we want to add/append to the menu item the following html:
    // <div class="hover-reveal">
    //   <div class="hover-reveal__img" style="background-image: url(pathToImage);"></div>
    // </div>
    layout() {
        // this is the element that gets its position animated (and perhaps other properties like the skew etc..)
        this.DOM.reveal = document.createElement('div');
        this.DOM.reveal.className = 'hover-reveal';
        
        this.totalImages = 5;
        let inner = '';
        for (let i = 0; i <= this.totalImages-1; ++i) {
            inner += i === this.totalImages-1 ? `<div class="hover-reveal__img" style="position: absolute; background-image:url(${images[this.inMenuPosition][1]})"></div>` :
                                                `<div class="hover-reveal__img" style="filter: hue-rotate(${getRandomFloat(10,90)}deg) saturate(${getRandomFloat(2,10)}); position: absolute; background-image:url(${images[this.inMenuPosition][1]})"></div>`;
        }
        this.DOM.reveal.innerHTML = inner;
        this.DOM.el.appendChild(this.DOM.reveal);
        this.DOM.revealImgs = [...this.DOM.reveal.querySelectorAll('.hover-reveal__img')];
    }
    // calculate the position/size of both the menu item and reveal element
    calcBounds() {
        this.bounds = {
            el: this.DOM.el.getBoundingClientRect(),
            reveal: this.DOM.reveal.getBoundingClientRect()
        };
    }
    // bind some events
    initEvents() {
        this.mouseenterFn = (ev) => {
            // show the image element
            this.showImage();
            this.firstRAFCycle = true;
            // start the render loop animation (rAF)
            this.loopRender();
        };
        this.mouseleaveFn = () => {
            // stop the render loop animation (rAF)
            this.stopRendering();
            // hide the image element
            this.hideImage();
        };
        
        this.DOM.el.addEventListener('mouseenter', this.mouseenterFn);
        this.DOM.el.addEventListener('mouseleave', this.mouseleaveFn);
    }
    // show the image element
    showImage() {
        // kill any current tweens
        gsap.killTweensOf(this.DOM.revealImgs);
        
        this.tl = gsap.timeline({
            onStart: () => {
                this.DOM.reveal.style.opacity = 1;
                // set a high z-index value so image appears on top of other elements
                gsap.set(this.DOM.el, {zIndex: images.length});
            }
        })
        .set(this.DOM.revealImgs, {
            opacity: 0
        }, 0);
        
        for (let i = 0; i <= this.totalImages-1; ++i) {
            gsap.set(this.DOM.revealImgs[i], {
                x: i === this.totalImages-1 ? '0%' : `${getRandomFloat(-40,40)}%`, 
                y: i === this.totalImages-1 ? '0%' : `${getRandomFloat(-40,40)}%`,
                rotation: `${i === this.totalImages-1 ? 0 : getRandomFloat(-10,10)}`
            });
            
            this.tl.to(this.DOM.revealImgs[i], 0.2, {
                ease: 'Quad.easeOut',
                startAt: {opacity: 1},
                opacity: i === this.totalImages-1 ? 1 : 0
            }, i*0.05);
        }
    }
    // hide the image element
    hideImage() {
        // kill any current tweens
        gsap.killTweensOf(this.DOM.revealImgs);

        this.tl = gsap.timeline({
            onStart: () => {
                gsap.set(this.DOM.el, {zIndex: 1});
            },
            onComplete: () => {
                gsap.set(this.DOM.reveal, {opacity: 0});
            }
        })
        .to(this.DOM.revealImgs, 0.15, {
            ease: 'Sine.easeOut',
            opacity: 0
        });
    }
    // start the render loop animation (rAF)
    loopRender() {
        if ( !this.requestId ) {
            this.requestId = requestAnimationFrame(() => this.render());
        }
    }
    // stop the render loop animation (rAF)
    stopRendering() {
        if ( this.requestId ) {
            window.cancelAnimationFrame(this.requestId);
            this.requestId = undefined;
        }
    }
    // translate the item as the mouse moves
    render() {
        this.requestId = undefined;

        if ( this.firstRAFCycle ) {
            // calculate position/sizes the first time
            this.calcBounds();
        }
        // calculate the mouse distance (current vs previous cycle)
        const mouseDistanceX = clamp(Math.abs(mousePosCache.x - mousepos.x), 0, 100);
        // direction where the mouse is moving
        direction = {x: mousePosCache.x-mousepos.x, y: mousePosCache.y-mousepos.y};
        // updated cache values
        mousePosCache = {x: mousepos.x, y: mousepos.y};

        // new translation values
        this.animatableProperties.tx.current = Math.abs(mousepos.x - this.bounds.el.left) - this.bounds.reveal.width/2;
        this.animatableProperties.ty.current = Math.abs(mousepos.y - this.bounds.el.top) - this.bounds.reveal.height/2;
        // new scale value
        this.animatableProperties.scale.current = this.firstRAFCycle ? 1 : map(mouseDistanceX,0,80,1,5);
        // new filter value
        this.animatableProperties.saturate.current = this.firstRAFCycle ? 1 : map(mouseDistanceX,0,10,1,0);

        // set up the interpolated values
        // for the first cycle, both the interpolated values need to be the same so there's no "lerped" animation between the previous and current state
        this.animatableProperties.tx.previous = this.firstRAFCycle ? this.animatableProperties.tx.current : lerp(this.animatableProperties.tx.previous, this.animatableProperties.tx.current, this.animatableProperties.tx.amt);
        this.animatableProperties.ty.previous = this.firstRAFCycle ? this.animatableProperties.ty.current : lerp(this.animatableProperties.ty.previous, this.animatableProperties.ty.current, this.animatableProperties.ty.amt);
        this.animatableProperties.scale.previous = this.firstRAFCycle ? this.animatableProperties.scale.current : lerp(this.animatableProperties.scale.previous, this.animatableProperties.scale.current, this.animatableProperties.scale.amt);
        this.animatableProperties.saturate.previous = this.firstRAFCycle ? this.animatableProperties.saturate.current : lerp(this.animatableProperties.saturate.previous, this.animatableProperties.saturate.current, this.animatableProperties.saturate.amt);
        
        // set styles
        gsap.set(this.DOM.reveal, {
            x: this.animatableProperties.tx.previous,
            y: this.animatableProperties.ty.previous,
            //scaleX: this.animatableProperties.scale.previous,
            //scaleY: map(this.animatableProperties.scale.previous,1,5,1,0.1),
            filter: `saturate(${this.animatableProperties.saturate.previous})`
        });
        gsap.set(this.DOM.revealImgs, {
            scaleX: this.animatableProperties.scale.previous,
            scaleY: map(this.animatableProperties.scale.previous,1,5,1,0.1)
        });

        // loop
        this.firstRAFCycle = false;
        this.loopRender();
    }
}