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
    }
}