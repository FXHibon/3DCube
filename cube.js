var canvas;

var cubeVerticesBuffer;
var cubeVerticesColorBuffer;

var cubeVerticesIndexBuffer;
var cubeRotation = 0.0;
var cubeXOffset = 0.0;
var cubeYOffset = 0.0;
var cubeZOffset = 0.0;
var lastCubeUpdateTime = 0;
var xIncValue = 0.2;
var yIncValue = -0.4;
var zIncValue = 0.3;

var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var vertexColorAttribute;
var perspectiveMatrix;
var interval;
var rotationSpeed = 30;

function resetClearColor(gl) {
    var stringColor = $('#background-picker').val();
    var clearColor = [];
    for (var rgbIndex = 0; rgbIndex < 3; rgbIndex++) {
        var intColor = parseInt(stringColor.substr(1 + 2 * rgbIndex, 2), 16);
        clearColor.push(intColor / 255);
    }
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], 1.0);  // Clear to black, fully opaque
}
/**
 * Application boostrap
 */
function start() {
    canvas = document.getElementById("glcanvas");

    var gl = initWebGL(canvas);      // Initialize the GL context

    // Only continue if WebGL is available and working

    if (gl) {
        resetClearColor(gl);
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        // Initialize the shaders; this is where all the lighting for the
        // vertices and so forth is established.

        initShaders(gl);

        // Here's where we call the routine that builds all the objects
        // we'll be drawing.

        initBuffers(gl);

        // Set up to draw the scene periodically.

        for (var i = 1; i <= 6; i++) {
            $('#color-picker' + i).change(function () {
                initBuffers(gl);
            });
        }

        $('#velocity-input').change(function () {
            rotationSpeed = $('#velocity-input').val();
            $('#rotation-speed-label').val(rotationSpeed);
        });

        $('#background-picker').change(function () {
            resetClearColor(gl);
        });

        rotationSpeed = $('#velocity-input').val();
        $('#rotation-speed-label').val(rotationSpeed);
        interval = setInterval(function () {
            drawScene(gl);
        }, 1000 / 24);
    }
}


/**
 * Get WebGLContext
 * @param canvas
 * @returns {*} WebGL context. Throws if not
 */
function initWebGL(canvas) {
    var gl;
    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    }
    catch (e) {
    }

    // If we don't have a GL context, give up now

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
    return gl;
}


/**
 * Init buffers (our cube)
 * @param gl
 */
function initBuffers(gl) {

    // Create a buffer for the cube's vertices.

    cubeVerticesBuffer = gl.createBuffer();

    // Select the cubeVerticesBuffer as the one to apply vertex
    // operations to from here out.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);

    // Now create an array of vertices for the cube.

    var vertices = [
        // Front face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0,
        -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0,
        -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0,
        -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0,
        -1.0, 1.0, 1.0,
        -1.0, 1.0, -1.0

    ];

    // Now pass the list of vertices into WebGL to build the shape. We
    // do this by creating a Float32Array from the JavaScript array,
    // then use it to fill the current vertex buffer.

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Now set up the colors for the faces. We'll use solid colors
    // for each face.


    // Convert hexadecimal string to rgb int colors
    var colors = [];
    for (var faceIndex = 1; faceIndex <= 6; faceIndex++) {
        var faceColor = [];
        var stringColor = $('#color-picker' + faceIndex).val();
        for (var rgbIndex = 0; rgbIndex < 3; rgbIndex++) {
            var intColor = parseInt(stringColor.substr(1 + 2 * rgbIndex, 2), 16);
            faceColor.push(intColor / 255);
        }
        faceColor.push(1.0);
        colors.push(faceColor);
    }


    // Convert the array of colors into a table for all the vertices.

    var generatedColors = [];

    for (var j = 0; j < 6; j++) {
        var c = colors[j];

        // Repeat each color four times for the four vertices of the face

        for (var i = 0; i < 4; i++) {
            generatedColors = generatedColors.concat(c);
        }
    }

    cubeVerticesColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(generatedColors), gl.STATIC_DRAW);

    // Build the element array buffer; this specifies the indices
    // into the vertex array for each face's vertices.

    cubeVerticesIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.

    var cubeVertexIndices = [
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // back
        8, 9, 10, 8, 10, 11,   // top
        12, 13, 14, 12, 14, 15,   // bottom
        16, 17, 18, 16, 18, 19,   // right
        20, 21, 22, 20, 22, 23    // left
    ];

    // Now send the element array to GL

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

//
// drawScene
//
// Draw the scene.
//
function drawScene(gl) {
    // Clear the canvas before we start drawing on it.

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    perspectiveMatrix = makePerspective(45, 640.0 / 480.0, 0.1, 100.0);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.

    loadIdentity();

    // Now move the drawing position a bit to where we want to start
    // drawing the cube.

    mvTranslate([-0.0, 0.0, -6.0]);

    // Save the current matrix, then rotate before we draw.

    mvPushMatrix();
    mvRotate(cubeRotation, [1, 0, 1]);

    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

    // Set the colors attribute for the vertices.

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesColorBuffer);
    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

    // Draw the cube.

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVerticesIndexBuffer);
    setMatrixUniforms(gl);
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);

    // Restore the original matrix

    mvPopMatrix();

    // Update the rotation for the next draw, if it's time to do so.

    var currentTime = (new Date).getTime();
    if (lastCubeUpdateTime) {
        var delta = currentTime - lastCubeUpdateTime;


        cubeRotation += (rotationSpeed * delta) / 1000.0;
        cubeXOffset += xIncValue * ((rotationSpeed * delta) / 1000.0);
        cubeYOffset += yIncValue * ((rotationSpeed * delta) / 1000.0);
        cubeZOffset += zIncValue * ((rotationSpeed * delta) / 1000.0);

        if (Math.abs(cubeYOffset) > 2.5) {
            xIncValue = -xIncValue;
            yIncValue = -yIncValue;
            zIncValue = -zIncValue;
        }
    }

    lastCubeUpdateTime = currentTime;
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders(gl) {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    // Create the shader program

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    gl.useProgram(shaderProgram);

    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);

    vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(vertexColorAttribute);
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);

    // Didn't find an element with the specified ID; abort.

    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.

    var theSource = "";
    var currentChild = shaderScript.firstChild;

    while (currentChild) {
        if (currentChild.nodeType == 3) {
            theSource += currentChild.textContent;
        }

        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we have,
    // based on its MIME type.

    var shader;

    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;  // Unknown shader type
    }

    // Send the source to the shader object

    gl.shaderSource(shader, theSource);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}