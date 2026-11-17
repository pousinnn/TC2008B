/*
 * CG_1
 * Paulina Cortez Balvanera
 * 2026-11-16
 */

'use strict';

//import tools and libraries to draw
import * as twgl from 'twgl-base.js';
import GUI from 'lil-gui';
import { diamond } from '../libs/shapes.js';
import { V2, M3, type Vec2, type Mat3 } from '../libs/2d-lib.js';
import { Scene } from '../libs/scene.js';

// import shaders from the other files
import vsGLSL from './vs_matrices_vcolor.glsl?raw';
import fsGLSL from './fs_vertex_color.glsl?raw';


// changes direction of face (upside down)
const FLIP_Y = 1;

//obj 1: create the face with triangles
function face(radius: number): twgl.Arrays {
    //save positions and colors
    const positionData: number[] = [];
    const colorData: number[] = [];
    const indexData: number[] = [];

    // we set the positions and colors and sets indices for the triangles
    //https://developer.mozilla.org/es/docs/Web/JavaScript/Reference/Global_Objects/Array/push
    const addVertex = (x: number, y: number, color: number[]): number => {
        positionData.push(x, y * FLIP_Y);
        colorData.push(...color);
        return positionData.length / 2 - 1;
    };

    //creates our face with various triangles
    const addPolygon = (cx: number, cy: number, polyRadius: number, polySides: number, color: number[]): void => {
        //angles between the polygons and set the center
        const polyStep = (2 * Math.PI)/polySides;
        const polyCenter = addVertex(cx, cy, color);
        const polyFirst = polyCenter + 1;

        //ciclo for  creating the triangles
        for (let i = 0; i < polySides; i++) {
            const angle = polyStep * i;
            addVertex(cx + polyRadius * Math.cos(angle), cy + polyRadius * Math.sin(angle), color);

            // unify center with the points (for triangle)
            const next = (i + 1 < polySides) ? polyFirst + i + 1 : polyFirst;
            indexData.push(polyCenter, polyFirst + i, next);
        }
    };

    // for the head
    addPolygon(0, 0, radius, 20, [1.00, 0.91, 0.62, 1.0]);

    //for the eyes (two)
    const black = [0, 0, 0, 1];
    for (const cx of [-0.35 * radius, 0.35 * radius]) {
        const cy = 0.15 * radius;
        const a = addVertex(cx - 0.12 * radius, cy + 0.1 * radius, black);
        const b = addVertex(cx + 0.12 * radius, cy + 0.1 * radius, black);
        const c = addVertex(cx, cy - 0.12 * radius, black);
        indexData.push(a, b, c);
    }

    //for the nose (polygon)
    addPolygon(0, 0, 0.2 * radius, 20, [0.95, 0.34, 0.25, 1.0]);

    //for mouth
    const red = [0.6, 0.1, 0.1, 1];
    const m1 = addVertex(-0.3 * radius, -0.3 * radius, red);
    const m2 = addVertex( 0.3 * radius, -0.3 * radius, red);
    const m3 = addVertex( 0.0, -0.6 * radius, red);
    indexData.push(m1, m2, m3);

    //for blush
    const blushFill = [0.96, 0.57, 0.54, 1.0];
    for (const side of [-1, 1]) {
        const bx= side * 0.58 * radius;
        const by= -0.28 * radius;
        addPolygon(bx, by, 0.18 * radius, 16, blushFill);
    }

    // organize everything so the webgl thing can draw the face
    const arrays: twgl.Arrays = {
        a_position:{ numComponents: 2, data: positionData },
        a_color:{ numComponents: 4, data: colorData },
        indices:{ numComponents: 3, data: indexData },
    };
    return arrays;
}

//obj 4: the lil gui for changing the order of transformations
const ORDER_NAMES = [
    'scale -> rotation -> translation',
    'scale -> translation -> rotation',
    'translation -> scale -> rotation',
    'rotation -> translation -> scale',
    'rotation -> scale -> translation',
] as const;

//the type that represents the options
//https://datatables.net/ref/core/type/DataTable.Order
type OrderName = typeof ORDER_NAMES[number];


//creating the scene (the face, pivot and the transformations)
class FaceScene extends Scene {
    //set initial orderr
    order: OrderName = 'scale -> rotation -> translation';

    constructor(gl: WebGL2RenderingContext) {
        //set shaders
        super(gl, vsGLSL, fsGLSL);

        //obj 2: create the little face
        const model = this.addObject('model', face(150), [Math.random(), Math.random(), Math.random(), 1 ]);
        model.transforms.t.x = gl.canvas.width/2;
        model.transforms.t.y = gl.canvas.height/2;
        //set size
        model.transforms.s.x = 1;
        model.transforms.s.y = 1;

        //create diamond pivot
        const pivot = this.addObject('pivot', diamond(30),[0.7, 0.62, 0.86, 1]);
        pivot.transforms.t.x = gl.canvas.width/5;
        pivot.transforms.t.y = gl.canvas.height/2;
    }

    // we draw the scene
    protected render(): void {
        const { gl, programInfo } = this;
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        // we position of the model
        const v2_trans: Vec2 = V2.create(model.transforms.t.x, model.transforms.t.y);
        const v2_scale: Vec2 = V2.create(model.transforms.s.x, model.transforms.s.y);

        //we position of the pivot 
        const v2_center_to_pivot: Vec2 = V2.create(pivot.transforms.t.x, pivot.transforms.t.y);

        // set matrices for the face
        const scaleMatrix: Mat3 = M3.scale(v2_scale);
        const translateMatrix: Mat3 = M3.translation(v2_trans);
        const rotationMatrix: Mat3 = M3.rotation(model.transforms.rr.z);

        //save the coordinates of both pivot and face
        const px = pivot.transforms.t.x;
        const py = pivot.transforms.t.y;
        const tx = model.transforms.t.x;
        const ty = model.transforms.t.y;
        // conditional for 0
        const sx = Math.abs(model.transforms.s.x) < 0.001 ? 0.001 : model.transforms.s.x;
        const sy = Math.abs(model.transforms.s.y) < 0.001 ? 0.001 : model.transforms.s.y;

        //save positions for doing the transformationss
        let pivotX = px;
        let pivotY = py;
        if (this.order === 'scale -> rotation -> translation') {
            // for translation after the rotation
            pivotX = px - tx;
            pivotY = py - ty;
        } else if (this.order === 'rotation -> translation -> scale') {
            // for rotation when 1sr translation and scale
            pivotX = px / sx - tx;
            pivotY = py / sy - ty;
        } else if (this.order === 'rotation -> scale -> translation') {
            //for rotation, first scale and then translation
            pivotX = (px - tx)/sx;
            pivotY = (py - ty)/sy;
        }
        //move towards or form pivot
        const toCenterMatrix: Mat3 = M3.translation(V2.create(-pivotX, -pivotY));
        const toPivotMatrix: Mat3 = M3.translation(V2.create(pivotX, pivotY));

        // turn arounf pivot
        const rotateAroundPivot: Mat3[] = [toCenterMatrix, rotationMatrix, toPivotMatrix];

        // save matrices in set order
        const orders: Record<OrderName, Mat3[]> = {
            'scale -> rotation -> translation':
                [scaleMatrix, ...rotateAroundPivot, translateMatrix],
            'scale -> translation -> rotation':
                [scaleMatrix, translateMatrix, ...rotateAroundPivot],
            'translation -> scale -> rotation':
                [translateMatrix, scaleMatrix, ...rotateAroundPivot],
            'rotation -> translation -> scale':
                [...rotateAroundPivot, translateMatrix, scaleMatrix],
            'rotation -> scale -> translation':
                [...rotateAroundPivot, scaleMatrix, translateMatrix],
        };

        //matrix without all the transformations
        let modelTransforms: Mat3 = M3.identity();
        //cicle for combining all the matrices
        for (const matrix of orders[this.order]) {
            modelTransforms = M3.multiply(matrix, modelTransforms);
        }

        //set the program we are using
        gl.useProgram(programInfo.program);

        //send the info we will be needing for drawing (canvas and stuff) 
        let uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: modelTransforms,
            u_color: model.color,
        };

        //apply and draw
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(model.vao);
        twgl.drawBufferInfo(gl, model.bufferInfo);

        //matrix for the pivot
        const translateMatrixPivot: Mat3 = M3.translation(v2_center_to_pivot);

        //translation for the pivot
        let pivotTransforms: Mat3 = M3.identity();
        pivotTransforms = M3.multiply(translateMatrixPivot, pivotTransforms);

        //we draw the pivot
        uniforms = {
            u_resolution: [gl.canvas.width, gl.canvas.height],
            u_transforms: pivotTransforms,
            u_color: pivot.color,
        };
        twgl.setUniforms(programInfo, uniforms);
        gl.bindVertexArray(pivot.vao);
        twgl.drawBufferInfo(gl, pivot.bufferInfo);
    }

    // obj 3/4: controls for lil gui
    setupUI(): void {
        const { gl } = this;
        //considers face and pivot for the properties
        const model = this.getObject('model');
        const pivot = this.getObject('pivot');

        //interface for lilgui
        const gui = new GUI();

        // menu for the transformations (dropdown thingy)
        gui.add(this, 'order', [...ORDER_NAMES]).name('Order');
        //controls over the face        
        const modelFolder = gui.addFolder('Model');
        const traFolder = modelFolder.addFolder('Translation');
        traFolder.add(model.transforms.t, 'x', 0, gl.canvas.width).onChange((value: number) => { 
            model.transforms.t.x = value;
            });
        traFolder.add(model.transforms.t, 'y', 0, gl.canvas.height) .onChange((value: number) => {
                model.transforms.t.y = value;
            });

            //for rotation
        const rotFolder = modelFolder.addFolder('Rotation');
        rotFolder.add(model.transforms.rr, 'z', 0, Math.PI * 2) .onChange((value: number) => {
                model.transforms.rr.z = value;
            });

            //for scaling
        const scaFolder = modelFolder.addFolder('Scale');
        scaFolder.add(model.transforms.s, 'x', -5, 5) .onChange((value: number) => {
                model.transforms.s.x = value;
            });
        scaFolder.add(model.transforms.s, 'y', -5, 5) .onChange((value: number) => {
                model.transforms.s.y = value;
            });

            //for translating
        const pivotFolder = gui.addFolder('Pivot');
        const pivotTraFolder = pivotFolder.addFolder('Translation');
        pivotTraFolder.add(pivot.transforms.t, 'x', 0, gl.canvas.width)
            .onChange((value: number) => {
                pivot.transforms.t.x = value;
            });
        pivotTraFolder.add(pivot.transforms.t, 'y', 0, gl.canvas.height)
            .onChange((value: number) => {
                pivot.transforms.t.y = value;
            });
    }
}

//main fuction, we prepare the canvas and the elements
function main(): void {
    //searches in html
    const canvas = document.querySelector('canvas');
    //canvas exists
    if (!canvas) {
        throw new Error('No canvas element found');
    }
    //connect
    const gl = canvas.getContext('webgl2');
    const scene = new FaceScene(gl);
    scene.setupUI();
    scene.draw(0);
}

//start main
main();