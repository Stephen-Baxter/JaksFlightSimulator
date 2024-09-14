const math = {
    CARTESIAN_2D_COORDINATE: class { constructor(x_, y_) { this.x = x_; this.y = y_; } },
    POLAR_2D_COORDINATE: class { constructor(a_, r_) { this.a = a_; this.r = r_; } },
    DegreeToRadian: function(degree_) { return degree_ * Math.PI / 180; },
    RadianToDegree: function(radian_) { return radian_ * 180 / Math.PI; },
    Clamp: function(input_, min_, max_)
    {
        if (input_ < min_) return min_;
        else if (input_ > max_) return max_;
        else return input_;
    },
    approximatelyEqual: function(number_one_, number_two_, epsilon = 0.001)
    {
        return Math.abs(number_one_ - number_two_) < epsilon;
    },
    CartesianToPolar: function(cartesian_, polar_)
    {
        let a = 0;
        if (cartesian_.x>0) a=Math.atan(cartesian_.y/cartesian_.x);
        else if (cartesian_.x<0&&cartesian_.y>=0) a=Math.PI+Math.atan(cartesian_.y/cartesian_.x);
        else if (cartesian_.x<0&&cartesian_.y<0) a=-Math.PI+Math.atan(cartesian_.y/cartesian_.x);
        else if (cartesian_.x===0&&cartesian_.y>0) a=Math.PI/2;
        else if (cartesian_.x===0&&cartesian_.y<0) a=-Math.PI/2;
        if (a < 0) a+=2*Math.PI;
        
        polar_.a = a;
        polar_.r = Math.sqrt(cartesian_.x*cartesian_.x+cartesian_.y*cartesian_.y);
    },
    PolarToCartesian: function(polar_, cartesian_)
    {
        cartesian_.x = Math.cos(polar_.a)*polar_.r;
        cartesian_.y = Math.sin(polar_.a)*polar_.r;
    },
    VECTOR: class
    {
        constructor(x_=0,y_=0,z_=0,w_=0)
        {
            this.vector = [x_,y_,z_,w_]
        }
        SubVector = function(vector_)
        {
            return new math.VECTOR(this.vector[0]-vector_[0],this.vector[1]-vector_[1],this.vector[2]-vector_[2])
        }
        AddVector = function(vector_)
        {
            return new math.VECTOR(this.vector[0]+vector_[0],this.vector[1]+vector_[1],this.vector[2]+vector_[2])
        }
        MulNumber = function(number_)
        {
            return new math.VECTOR(this.vector[0]*number_,this.vector[1]*number_,this.vector[2]*number_)
        }
        MulMatrix = function(matrix_)
        {
            let v = [];
            for (let i = 0; i < 4; i++) v.push(this.vector[0]*matrix_[0][i]+this.vector[1]*matrix_[1][i]+this.vector[2]*matrix_[2][i]+matrix_[3][i]);
            if (v[3] != 0) { v[0]=v[0]/v[3]; v[1]=v[1]/v[3]; v[2]=v[2]/v[3]; }
            return new math.VECTOR(v[0],v[1],v[2]);
        }
        DotProduct = function(vector_)
        {
            return this.vector[0]*vector_[0]+this.vector[1]*vector_[1]+this.vector[2]*vector_[2];
        }
        CrossProduct = function(vector_)
        {
            let v = new math.VECTOR();
            v.vector[0] = this.vector[1] * vector_[2] - this.vector[2] * vector_[1];
            v.vector[1] = this.vector[2] * vector_[0] - this.vector[0] * vector_[2];
            v.vector[2] = this.vector[0] * vector_[1] - this.vector[1] * vector_[0];
            return v;
        }
        magnitude = function()
        {
            let sum = 0;
            for (let i = 0; i < 4; i++) sum += this.vector[i]*this.vector[i];
            if (sum === 0) return 0;
            else return Math.sqrt(sum);
        }
        magnitudeSquared = function()
        {
            let sum = 0;
            for (let i = 0; i < 4; i++) sum += this.vector[i]*this.vector[i];
            return sum;
        }
        Normalise = function()
        {
            let sum = 0;
            for (let i = 0; i < 4; i++) sum += this.vector[i]*this.vector[i];
            if (sum === 0) return new math.VECTOR();
            else return new math.VECTOR(this.vector[0], this.vector[1], this.vector[2]).MulNumber(1/Math.sqrt(sum));
        }
        Projection = function(vector_)
        {
            let b = new math.VECTOR(vector_[0], vector_[1], vector_[2]);
            let a = b.DotProduct(this.vector);
            let c = b.magnitude();
            if (c != 0) return a / c;
            else return 0;
        }
        Equal = function(vector_)
        {
            //console.log(this.vector === vector_)
            return math.approximatelyEqual(this.vector[0], vector_[0]) && math.approximatelyEqual(this.vector[1], vector_[1]) && math.approximatelyEqual(this.vector[2], vector_[2])
        }
        Angle = function(vector_)
        {
            return Math.acos(this.vector[0]*vector_[0]+this.vector[1]*vector_[1]+this.vector[2]*vector_[2]);
        }
    },
    MATRIX: class 
    {
        constructor(matrix_ = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])
        {
            this.matrix = matrix_;
        }

        static CreateRotationMatrix(angle_, vector_)
        {
            let m = new math.MATRIX()
            m.matrix[0][0]=vector_[0]*vector_[0]+(1-vector_[0]*vector_[0])*Math.cos(angle_);
            m.matrix[0][1]=(1-Math.cos(angle_))*vector_[0]*vector_[1]-vector_[2]* Math.sin(angle_);
            m.matrix[0][2]=(1-Math.cos(angle_))*vector_[0]*vector_[2]+vector_[1]* Math.sin(angle_);
            m.matrix[1][0]=(1-Math.cos(angle_))*vector_[0]*vector_[1]+vector_[2]* Math.sin(angle_);
            m.matrix[1][1]=vector_[1]*vector_[1]+(1-vector_[1]*vector_[1])*Math.cos(angle_);
            m.matrix[1][2]=(1-Math.cos(angle_))*vector_[1]*vector_[2]-vector_[0]* Math.sin(angle_);
            m.matrix[2][0]=(1-Math.cos(angle_))*vector_[0]*vector_[2]-vector_[1]* Math.sin(angle_);
            m.matrix[2][1]=(1-Math.cos(angle_))*vector_[1]*vector_[2]+vector_[0]* Math.sin(angle_);
            m.matrix[2][2]=vector_[2]*vector_[2]+(1-vector_[2]*vector_[2])*Math.cos(angle_);
            return m;
        }
        static CreateProjectionMatrix(screen_width_, screen_height_, f_o_v_, z_far_, z_near_)
        {
            let q = z_far_/(z_far_-z_near_);
            let a = screen_height_/screen_width_;
            let f = 1/Math.tan(f_o_v_/2);
            let m = new math.MATRIX([[a*f,0,0,0],[0,f,0,0],[0,0,-q,-1],[0,0,-z_near_*q,0]]);
            return m;
        }

        ConvertToWebglMatrix = function()
        {
            let webglMatrix = [];
            for (let i = 0; i < 4; i++) {
                for (let j = 0; j < 4; j++) {
                    webglMatrix.push(this.matrix[i][j])
                }
            }
            return webglMatrix;
        }

        Inverse = function()
        {
            let m = new math.MATRIX();
            for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m.matrix[i][j] = this.matrix[j][i];
            for (let i = 0; i < 3; i++) m.matrix[3][i]=-(this.matrix[3][0]*m.matrix[0][i]+this.matrix[3][1]*m.matrix[1][i]+this.matrix[3][2]*m.matrix[2][i]);
            return m;
        }
        MulMatrix = function(matrix_)
        {
            let m = new math.MATRIX([[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
            for (let i = 0; i < 4; i++)
            {
                for (let j = 0; j < 4; j++)
                {
                    for (let k = 0; k < 4; k++)
                    {
                        m.matrix[i][j]+=this.matrix[i][k]*matrix_[k][j];
                    }
                }
            }
            return m;
        }
        Orthonormalized = function()
        {
            let m = new math.MATRIX();
            let z = (new math.VECTOR(this.matrix[2][0],this.matrix[2][1],this.matrix[2][2])).Normalise();
            let x = (new math.VECTOR(this.matrix[1][0],this.matrix[1][1],this.matrix[1][2])).CrossProduct(z.vector).Normalise();
            let y = z.CrossProduct(x.vector);
            m.matrix[0] = [x.vector[0],x.vector[1],x.vector[2],0];
            m.matrix[1] = [y.vector[0],y.vector[1],y.vector[2],0];
            m.matrix[2] = [z.vector[0],z.vector[1],z.vector[2],0];
            this.matrix = m.matrix;
        }
        Copy = function()
        {
            let m = new math.MATRIX();
            for (let i = 0; i < 4; i++)
            {
                for (let j = 0; j < 4; j++) {
                    m.matrix[i][j] = this.matrix[i][j];
                }
            }
            return m;
        }
    }
}