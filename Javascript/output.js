const output = {
    GAME_LOOP: class
    {
        constructor(On_Start_, On_Update_)
        {
            this.lastTimePoint = 0;
            this.OnStart = On_Start_;
            this.OnUpdate = On_Update_
            this.animationId = null;
        }
    
        Start()
        {
            this.OnStart();

            const step = (times_tamp_) =>{
                let elapsedTime = (times_tamp_ - this.lastTimePoint)/1000;
                this.lastTimePoint = times_tamp_;

                this.OnUpdate(elapsedTime);

                this.animationId = window.requestAnimationFrame(step);
            };
          
            this.animationId = window.requestAnimationFrame(step);
        }

        
    },
    WEB_GL: class
    {
        constructor(gl_, canvas_, vertices_)
        {
            this.gl = gl_;
            this.canvas = canvas_;
            this.vertices = vertices_;
            this.colors = [];
            this.indices = [];

            for (let i = 0; i < this.vertices.length; i=i+3)
            {
                this.colors.push(0);
                this.colors.push(1);
                this.colors.push(0);
            }
            for (let i = 0; i < this.vertices.length; i++) this.indices.push(i);

            this.vertexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.vertices), this.gl.STATIC_DRAW);

            this.colorBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.colors), this.gl.STATIC_DRAW);

            this.indexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), this.gl.STATIC_DRAW);

            this.vertCode = 'attribute vec3 position;'+
                    'uniform mat4 Pmatrix;'+
                    'uniform mat4 Vmatrix;'+
                    'attribute vec3 color;'+//the color of the point
                    'varying vec3 vColor;'+

                    'void main(void) { '+//pre-built function
                    'gl_Position = Pmatrix*Vmatrix*vec4(position, 1.);'+
                    'vColor = color;'+
                    '}';

            this.fragCode = 'precision mediump float;'+
                    'varying vec3 vColor;'+
                    'void main(void) {'+
                    'gl_FragColor = vec4(vColor, 1.);'+
                    '}';

            this.vertShader = this.gl.createShader(this.gl.VERTEX_SHADER);
            this.gl.shaderSource(this.vertShader, this.vertCode);
            this.gl.compileShader(this.vertShader);

            this.fragShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
            this.gl.shaderSource(this.fragShader, this.fragCode);
            this.gl.compileShader(this.fragShader);

            this.shaderProgram = this.gl.createProgram();
            this.gl.attachShader(this.shaderProgram, this.vertShader);
            this.gl.attachShader(this.shaderProgram, this.fragShader);
            this.gl.linkProgram(this.shaderProgram);

            this.Pmatrix = this.gl.getUniformLocation(this.shaderProgram, "Pmatrix");
            this.Vmatrix = this.gl.getUniformLocation(this.shaderProgram, "Vmatrix");

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
            this.position = this.gl.getAttribLocation(this.shaderProgram, "position");
            this.gl.vertexAttribPointer(this.position, 3, this.gl.FLOAT, false,0,0) ;

            // Position
            this.gl.enableVertexAttribArray(this.position);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
            this.color = this.gl.getAttribLocation(this.shaderProgram, "color");
            this.gl.vertexAttribPointer(this.color, 3, this.gl.FLOAT, false,0,0);

            // Color
            this.gl.enableVertexAttribArray(this.color);
            this.gl.useProgram(this.shaderProgram);
        }

        Draw(projection_matrix_, view_matrix_)
        {
            this.gl.enable(this.gl.DEPTH_TEST);
            this.gl.depthFunc(this.gl.LEQUAL);
            this.gl.clearColor(0.0, 0.0, 0.0, 1);
            this.gl.clearDepth(1.0);

            this.gl.viewport(0.0, 0.0, this.canvas.width, this.canvas.height);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            this.gl.uniformMatrix4fv(this.Pmatrix, false, projection_matrix_.ConvertToWebglMatrix());
            this.gl.uniformMatrix4fv(this.Vmatrix, false, view_matrix_.ConvertToWebglMatrix());
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            this.gl.drawElements(this.gl.LINES, this.indices.length, this.gl.UNSIGNED_SHORT, 0);
        }
    }
}