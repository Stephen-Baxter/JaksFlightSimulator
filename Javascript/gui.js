const gui = {
    input:
    {
        KEY_BUFFER: class
        {
            constructor()
            {
                this.buffer = [];
                let buffer = this.buffer
                document.addEventListener('keydown', function(event_) { if (!buffer.includes(event_.key)) buffer.push(event_.key); });
                document.addEventListener('keyup', function(event_) { if (buffer.includes(event_.key)) buffer.splice(buffer.indexOf(event_.key), 1); });
            }
            IsKeyDown = function()
            {
            
                for (i=0; i < arguments.length; i++)
                {
                    if (!this.buffer.includes(arguments[i])) return false;
                }
                return true;
            }
            IsAnyKeyDown = function()
            {
            return this.buffer.length != 0;
            }
            IsKeyUp = function()
            {
                for (i=0; i < arguments.length; i++)
                {
                    if (this.buffer.includes(arguments[i])) return false;
                }
                return true;
            }
            IsAllKeysUp = function()
            {
                return this.buffer.length == 0;
            }
        },
        BUTTON: class
        {
            constructor()
            {
                this.down = false;
            }
        },
        JOY_STICK: class
        {
            #cartesian = new jge.math.CARTESIAN_2D_COORDINATE(0,0);
            #polar = new jge.math.POLAR_2D_COORDINATE(0,0);
            #left = false; #down = false; #right = false; #up = false;
            constructor(dead_zone_=0)
            {
                this.deadZone = dead_zone_;
            }
            #SetDirection = function()
            {
                this.#left = this.#down = this.#right = this.#up = false;
                if (this.#polar.r > this.deadZone && (this.#polar.a>=13*Math.PI/8 || this.#polar.a<3*Math.PI/8)) this.#left = true;
                if (this.#polar.r > this.deadZone && this.#polar.a>=Math.PI/8 && this.#polar.a<7*Math.PI/8) this.#down = true;
                if (this.#polar.r > this.deadZone && this.#polar.a>=5*Math.PI/8 && this.#polar.a<11*Math.PI/8) this.#right = true;
                if (this.#polar.r > this.deadZone && this.#polar.a>=9*Math.PI/8 && this.#polar.a<15*Math.PI/8) this.#up = true;
            }
            get cartesian() { return this.#cartesian; }
            get polar() { return this.#polar; }
            get left() { return this.#left; }
            get down() { return this.#down; }
            get right() { return this.#right; }
            get up() { return this.#up; }
            set cartesian(cartesian_)
            {
                this.#cartesian = cartesian_;
                jge.math.CartesianToPolar(this.#cartesian, this.#polar);
                this.#SetDirection();
            }
            set polar(polar_)
            {
                this.#polar = polar_;
                jge.math.PolarToCartesian(this.#polar, this.#cartesian);
                this.#SetDirection();
            }
            IsOutOfDeadZone = function()
            {
                return this.#polar.r > this.deadZone;
            }
            Zero = function()
            {
                this.#left = this.#right = this.#down = this.#up = false;
                this.#cartesian.x = this.#cartesian.y = 0;
                jge.math.CartesianToPolar(this.#cartesian, this.#polar);
            }
            SetCartesian = function(x_, y_)
            {
                this.#cartesian.x = x_;
                this.#cartesian.y = y_;
                jge.math.CartesianToPolar(this.#cartesian, this.#polar);
                this.#SetDirection();
            }
            SetCartesianX = function(x_)
            {
                this.#cartesian.x = x_;
                jge.math.CartesianToPolar(this.#cartesian, this.#polar);
                this.#SetDirection();
            }
            SetCartesianY = function(y_)
            {
                this.#cartesian.y = y_;
                jge.math.CartesianToPolar(this.#cartesian, this.#polar);
                this.#SetDirection();
            }
            SetPolar = function(a_, r_)
            {
                this.#polar.a = a_;
                this.#polar.r = r_;
                jge.math.PolarToCartesian(this.#polar, this.#cartesian);
                this.#SetDirection();
            }
            SetPolarA = function(a_)
            {
                this.#polar.a = a_;
                jge.math.PolarToCartesian(this.#polar, this.#cartesian);
                this.#SetDirection();
            }
            SetPolarR = function(r_)
            {
                this.#polar.r = r_;
                jge.math.PolarToCartesian(this.#polar, this.#cartesian);
                this.#SetDirection();
            }
        },
        GAME_PAD: class
        {
            #index = -1;
            constructor(index_=0, buttons_=[], axes_=[])
            {
                index_=index_;
                this.joyStick = new jge.input.JOY_STICK();
                this.buttonA = new jge.input.BUTTON();
                this.buttonB = new jge.input.BUTTON();
                this.buttonX = new jge.input.BUTTON();
                this.buttonY = new jge.input.BUTTON();
                this.buttonStart = new jge.input.BUTTON();
                this.buttonSelect = new jge.input.BUTTON();
            }
            get index() { return index_;}
        }
    },
}