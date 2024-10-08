let canvas = null;
let gl = null;
let gamePad = null
let keyBuffer = null;
let player = null;
let world = null
let webgl = null;
let gameLoop = null;

class PLAYER
{
    constructor(screen_width_, screen_height_, f_o_v_, z_far_, z_near_)
    {
        this.orientation = new math.MATRIX([[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])
        this.position = new math.VECTOR(0, 1, 0)
        this.projectionMatrix = math.MATRIX.CreateProjectionMatrix(screen_width_, screen_height_, f_o_v_, z_far_, z_near_);
        this.oldVelocityVector = new math.VECTOR();
        this.oldVelocity = { alongPlayerXFrontVector: 0, alongPlayerXBackVector: 0, alongPlayerYFrontVector: 0, alongPlayerYBackVector: 0, alongPlayerZLeftVector: 0, alongPlayerZRightVector: 0 };
        this.mass = 100.0;
        this.dragCoefficient = {front: 0.5, back: 1.14, topAndBottom: 1.28, leftAndRight: 0.8};
        this.engineRPM = 0;
        this.propellerRadius = 1;
        this.ignitionOn = false;
        this.aileronPosition = 0.0; //roll
        this.elevatorPosition = 0.0; //pitch
        this.rudderPosition = 0.0; //yaw
        this.throttlePosition = 0;
        this.xCrossSectionArea = {front: 5, back: 20};
        this.yCrossSectionArea = {front: 10, back: 30};
        this.zCrossSectionArea = {left: 10, right: 10}
        this.xRotationSpeed = 0.0;
        this.yRotationSpeed = 0.0;
        this.oldYawAngle = 0.0;
        this.zRotationSpeed = 0.0;
        this.distanceToStabilizers = 10.01;
        this.oldRelativeWindSpeedVector = new math.VECTOR(0, 0, 0, 0)
        //this.length = 
    }

    GetLiftCoefficient = function(control_surface_angle_, angle_of_attack_, offset_)
    {
        let i = offset_ + control_surface_angle_;
        let a = -i/((Math.PI/2)**2);
        let b = 1;
        let c = i;
        let offsetAngleOfAttack = a*angle_of_attack_**2+b*angle_of_attack_+c;
        let angleOfAttackMidMin = -Math.PI/8;
        let angleOfAttackMidMax = Math.PI/8;
        if (i !== 0)
        {
            angleOfAttackMidMin = (-b+Math.sqrt(b-4*a*(c+Math.PI/8)))/(2*a);
            angleOfAttackMidMax = (-b+Math.sqrt(b-4*a*(c-Math.PI/8)))/(2*a);
        }
        if (angle_of_attack_ >= -Math.PI/2 && angle_of_attack_ < angleOfAttackMidMin)
        {
            return Math.sin(4*(Math.PI-offsetAngleOfAttack)/3);
        }
        else if (angle_of_attack_ >= angleOfAttackMidMin && angle_of_attack_ < angleOfAttackMidMax)
        {
            return Math.sin(4*offsetAngleOfAttack)
        }
        else
        {
            return Math.sin(4*(-Math.PI-offsetAngleOfAttack)/3);
        }
    }
    
}

class WORLD
{
    constructor()
    {
        this.size = 1000;
        this.fieldSize = this.size/20;

        this.vertices = [];
        for (let i = 0; i < this.fieldSize; i++)
        {
            let x = -this.size/2 + i * this.size / this.fieldSize;
            let z = -this.size/2 + i * this.size / this.fieldSize;
            this.vertices.push(x, 0, -this.size/2, x, 0, this.size/2);
            this.vertices.push(-this.size/2, 0, z, this.size/2, 0, z);
        }

        this.windSpeedVector = new math.VECTOR(7, 0, 0, 0);//m/s
        this.airDensity = 0.1
    }
}

const OnStart = function()
{
    player = new PLAYER(canvas.width, canvas.height, math.DegreeToRadian(60), 10000, 0.1);
    world = new WORLD();
    webgl = new output.WEB_GL(gl, canvas, world.vertices);

    
}

const UpdateControl = function(plane_control_, button_one_, button_two_, degree_turn_, degree_min_ , degree_max_)
{
    if (button_one_ && !button_two_) plane_control_ += degree_turn_;
    else if (!button_one_ && button_two_) plane_control_ -= degree_turn_;
    else if (button_one_ && button_two_) plane_control_ = 0;
    else plane_control_ = plane_control_;
    if (plane_control_ > degree_max_) plane_control_ = degree_max_;
    if (plane_control_ < degree_min_) plane_control_ = degree_min_;
    return plane_control_
}

const OnUpdate = function(delta_time_)
{
    gamePad.Update();

    //player.throttlePosition = UpdateControl(player.throttlePosition, keyBuffer.IsKeyDown("p"), keyBuffer.IsKeyDown(";"), 5.0, 0.0, 45.0)
    let accelerateButton = keyBuffer.IsKeyDown("p");
    let decelerateButton = keyBuffer.IsKeyDown(";");
    if (accelerateButton && !decelerateButton) player.throttlePosition += 5.0;
    else if (!accelerateButton && decelerateButton) player.throttlePosition -= 5.0;
    else if (accelerateButton && decelerateButton) player.throttlePosition = 0;
    else player.throttlePosition = player.throttlePosition;
    if (player.throttlePosition > 45.0) player.throttlePosition = 45.0;
    if (player.throttlePosition < 0.0) player.throttlePosition = 0.0;

    let leftButton = keyBuffer.IsKeyDown("l");
    let rightButton = keyBuffer.IsKeyDown("'");
    if (leftButton && !rightButton) player.rudderPosition += 5.0;
    else if (!leftButton && rightButton) player.rudderPosition -= 5.0;
    else if (leftButton && rightButton) player.rudderPosition = 0;
    else player.rudderPosition = player.rudderPosition;
    if (player.rudderPosition > 45.0) player.rudderPosition = 45.0;
    if (player.rudderPosition < 0.0) player.rudderPosition = 0.0;

    if (keyBuffer.IsKeyDown("q") && !player.ignitionOn)
    {
        player.ignitionOn = !player.ignitionOn;
    }

    if (player.ignitionOn)
    {
        if (!player.engineOn) player.engineOn = true;
        if (player.engineRPM < player.throttlePosition*0.5) player.engineRPM += delta_time_*0.5;
        if (player.engineRPM > player.throttlePosition*0.5) player.engineRPM -= delta_time_*0.5;
    }
    else
    {
        if (player.engineOn) player.engineOn = false;
        if (player.engineRPM > 0) player.engineRPM -= delta_time_*0.5;
        if (player.engineRPM < 0) player.engineRPM = 0;
    }

    //let oldOrientation = player.orientation.Copy();
    let oldOrientationXUnitVector = new math.VECTOR(player.orientation.matrix[0][0], player.orientation.matrix[0][1], player.orientation.matrix[0][2]);
    let oldOrientationYUnitVector = new math.VECTOR(player.orientation.matrix[1][0], player.orientation.matrix[1][1], player.orientation.matrix[1][2]);
    let oldOrientationZUnitVector = new math.VECTOR(player.orientation.matrix[2][0], player.orientation.matrix[2][1], player.orientation.matrix[2][2]);

    //console.log(oldOrientationZUnitVector.CrossProduct(oldOrientationXUnitVector.vector).vector, oldOrientationXUnitVector.vector, oldOrientationYUnitVector.vector, oldOrientationZUnitVector.vector)

    let oldPlayerSpeedSquared = player.oldVelocityVector.magnitudeSquared();
    let oldPlayerSpeedUnitVector = player.oldVelocityVector.Normalise();
    if (oldPlayerSpeedSquared === 0) oldPlayerSpeedUnitVector = oldOrientationZUnitVector;

    let windSpeed = world.windSpeedVector.magnitude();
    let windSpeedSquared = world.windSpeedVector.magnitudeSquared();
    let WindSpeedUnitVector = world.windSpeedVector.Normalise();

    let relativeWindSpeedVector = (world.windSpeedVector.SubVector(player.oldVelocityVector.vector));
    let relativeWindSpeed = relativeWindSpeedVector.magnitude();
    let relativeWindSpeedSquared = relativeWindSpeedVector.magnitudeSquared();
    let relativeWindSpeedUnitVector = relativeWindSpeedVector.Normalise();

    let windAlongPlayerXVectorSpeed = world.windSpeedVector.Projection(oldOrientationXUnitVector.MulNumber(windSpeed).vector);
    let windAlongPlayerYVectorSpeed = world.windSpeedVector.Projection(oldOrientationYUnitVector.MulNumber(windSpeed).vector);
    let windAlongPlayerZVectorSpeed = world.windSpeedVector.Projection(oldOrientationZUnitVector.MulNumber(windSpeed).vector);

    let relativeWindAlongPlayerXVectorSpeed = relativeWindSpeedVector.Projection(oldOrientationXUnitVector.MulNumber(relativeWindSpeed).vector);
    let relativeWindAlongPlayerYVectorSpeed = relativeWindSpeedVector.Projection(oldOrientationYUnitVector.MulNumber(relativeWindSpeed).vector);
    let relativeWindAlongPlayerZVectorSpeed = relativeWindSpeedVector.Projection(oldOrientationZUnitVector.MulNumber(relativeWindSpeed).vector);

    //console.log(player.oldSpeedVector.magnitude(), "w", [windAlongPlayerXVectorSpeed, windAlongPlayerYVectorSpeed, windAlongPlayerZVectorSpeed], "r", [relativeWindAlongPlayerXVectorSpeed, relativeWindAlongPlayerYVectorSpeed, relativeWindAlongPlayerZVectorSpeed]);

    //console.log(windAlongPlayerXVectorSpeed, relativeWindAlongPlayerXVectorSpeed, player.position.vector);

    let isRelativeWindAlongOldOrientationXAxis = relativeWindSpeedUnitVector.Equal(oldOrientationXUnitVector.vector) || relativeWindSpeedUnitVector.Equal(oldOrientationXUnitVector.MulNumber(-1).vector);
    let isRelativeWindAlongOldOrientationYAxis = relativeWindSpeedUnitVector.Equal(oldOrientationYUnitVector.vector) || relativeWindSpeedUnitVector.Equal(oldOrientationYUnitVector.MulNumber(-1).vector);
    let angleOfAttackOnPlaneOfoldOrientationYZ = null;
    let angleOfAttackOnPlaneOfoldOrientationXZ = null;
    if (!isRelativeWindAlongOldOrientationXAxis)
    {
        let oldOrientationXRelativeWindCrossProduct = oldOrientationXUnitVector.CrossProduct(relativeWindSpeedUnitVector.MulNumber(-1).vector);
        let relativeWindSpeedOnPlaneOfoldOrientationYZ = oldOrientationXRelativeWindCrossProduct.CrossProduct(oldOrientationXUnitVector.vector);
        angleOfAttackOnPlaneOfoldOrientationYZ = oldOrientationZUnitVector.Angle(relativeWindSpeedOnPlaneOfoldOrientationYZ.vector);
        if (oldOrientationYUnitVector.Angle(oldOrientationXRelativeWindCrossProduct.vector) > Math.PI/2) angleOfAttackOnPlaneOfoldOrientationYZ *=-1;
    }
    if (!isRelativeWindAlongOldOrientationYAxis)
    {
        let oldOrientationYRelativeWindCrossProduct = oldOrientationYUnitVector.CrossProduct(relativeWindSpeedUnitVector.MulNumber(-1).vector);
        let relativeWindSpeedOnPlaneOfoldOrientationXZ = oldOrientationYRelativeWindCrossProduct.CrossProduct(oldOrientationYUnitVector.vector);
        angleOfAttackOnPlaneOfoldOrientationXZ = oldOrientationZUnitVector.Angle(relativeWindSpeedOnPlaneOfoldOrientationXZ.vector);
        if (oldOrientationXUnitVector.Angle(oldOrientationYRelativeWindCrossProduct.vector) > Math.PI/2) angleOfAttackOnPlaneOfoldOrientationXZ *=-1;
    }

    //console.log(angleOfAttackOnPlaneOfoldOrientationYZ, angleOfAttackOnPlaneOfoldOrientationXZ, isRelativeWindAlongOldOrientationXAxis, isRelativeWindAlongOldOrientationYAxis);

    //thrust_force = exit_mass_flow_rate * exit_plane_z_speed - enter_mass_flow_rate * entry_plane_z_speed, 
    //mass_flow_rate = air_density * plane_z_speed * cross_section_area 
    let airSpeedFromEngineAlongAirplaneZAxis = player.engineRPM;
    let enterAirSpeedAlongAirplaneZAxis = relativeWindAlongPlayerZVectorSpeed;
    let exitAirSpeedAlongAirplaneZAxis = enterAirSpeedAlongAirplaneZAxis + airSpeedFromEngineAlongAirplaneZAxis;
    let exitMassFlowRate = world.airDensity*exitAirSpeedAlongAirplaneZAxis*2*Math.PI*(player.propellerRadius**2);
    let enterMassFlowRate = world.airDensity*enterAirSpeedAlongAirplaneZAxis*2*Math.PI*(player.propellerRadius**2);
    let thrustForce = exitMassFlowRate*exitAirSpeedAlongAirplaneZAxis-enterMassFlowRate*enterAirSpeedAlongAirplaneZAxis;//kg*m/s^2
    let thrustForceVector = oldOrientationZUnitVector.MulNumber(thrustForce)

    //lift Coefficient
    let liftCoefficient = 0

    if (angleOfAttackOnPlaneOfoldOrientationYZ !== null)
    {

    }
    if (angleOfAttackOnPlaneOfoldOrientationXZ !== null)
    {

    }
    
    //wind force = 1/2 * C * p * Area * SpeedSquared
    let windAlongPlayerXFrontVectorForce = Math.sign(windAlongPlayerXVectorSpeed) * 0.5 * world.airDensity * player.xCrossSectionArea.front * windAlongPlayerXVectorSpeed**2;
    let windAlongPlayerXBackVectorForce = Math.sign(windAlongPlayerXVectorSpeed) * 0.5 * world.airDensity * player.xCrossSectionArea.back * windAlongPlayerXVectorSpeed**2;
    let windAlongPlayerYFrontVectorForce = Math.sign(windAlongPlayerYVectorSpeed) * 0.5 * world.airDensity * player.yCrossSectionArea.front * windAlongPlayerYVectorSpeed**2;
    let windAlongPlayerYBackVectorForce = Math.sign(windAlongPlayerYVectorSpeed) * 0.5 * world.airDensity * player.yCrossSectionArea.back * windAlongPlayerYVectorSpeed**2;
    let windAlongPlayerZLeftVectorForce = Math.sign(windAlongPlayerZVectorSpeed) * 0.5 * world.airDensity * player.zCrossSectionArea.left * windAlongPlayerZVectorSpeed**2;
    let windAlongPlayerZRightVectorForce = Math.sign(windAlongPlayerZVectorSpeed) * 0.5 * world.airDensity * player.zCrossSectionArea.right * windAlongPlayerZVectorSpeed**2;
    
    
    let appliedAlongPlayerXFrontVectorForce = windAlongPlayerXFrontVectorForce;
    let appliedAlongPlayerXBackVectorForce = windAlongPlayerXBackVectorForce;
    let appliedAlongPlayerYFrontVectorForce = windAlongPlayerYFrontVectorForce;
    let appliedAlongPlayerYBackVectorForce = windAlongPlayerYBackVectorForce;
    let appliedAlongPlayerZLeftVectorForce = windAlongPlayerZLeftVectorForce;
    let appliedAlongPlayerZRightVectorForce = windAlongPlayerZRightVectorForce;


    //let windForceVector = windAlongPlayerXVectorForceVector.AddVector(windAlongPlayerYVectorForceVector.vector).AddVector(windAlongPlayerZVectorForceVector.vector);

    //Induced Drag Coefficient = lift Coefficient^2 / (pi * AR * e)
    let inducedDragCoefficient = liftCoefficient * liftCoefficient / (Math.PI*2.5*2.5*0.7)
    //Drag force = 1/2 * C * p * Area * SpeedSquared
    
    let dragAlongPlayerXFrontVectorForce = 0.5 * player.dragCoefficient.leftAndRight * world.airDensity * player.xCrossSectionArea.front * relativeWindAlongPlayerXVectorSpeed**2;
    let dragAlongPlayerXBackVectorForce = 0.5 * player.dragCoefficient.leftAndRight * world.airDensity * player.xCrossSectionArea.back * relativeWindAlongPlayerXVectorSpeed**2;
    let dragAlongPlayerYFrontVectorForce = 0.5 * player.dragCoefficient.topAndBottom * world.airDensity * player.yCrossSectionArea.front * relativeWindAlongPlayerYVectorSpeed**2;
    let dragAlongPlayerYBackVectorForce = 0.5 * player.dragCoefficient.topAndBottom * world.airDensity * player.yCrossSectionArea.back * relativeWindAlongPlayerYVectorSpeed**2;
    let playerDragCoefficientFrontAndBackForDragForce = (relativeWindAlongPlayerZVectorSpeed >= 0) ? player.dragCoefficient.front : player.dragCoefficient.back;
    let dragAlongPlayerZLeftVectorForce = 0.5 * playerDragCoefficientFrontAndBackForDragForce * world.airDensity * player.zCrossSectionArea.left * relativeWindAlongPlayerZVectorSpeed**2;
    let dragAlongPlayerZRightVectorForce = 0.5 * playerDragCoefficientFrontAndBackForDragForce * world.airDensity * player.zCrossSectionArea.right * relativeWindAlongPlayerZVectorSpeed**2;

    let resistiveAlongPlayerXFrontVectorForce = dragAlongPlayerXFrontVectorForce;
    let resistiveAlongPlayerXBackVectorForce = dragAlongPlayerXBackVectorForce;
    let resistiveAlongPlayerYFrontVectorForce = dragAlongPlayerYFrontVectorForce;
    let resistiveAlongPlayerYBackVectorForce = dragAlongPlayerYBackVectorForce;
    let resistiveAlongPlayerZLeftVectorForce = dragAlongPlayerZLeftVectorForce;
    let resistiveAlongPlayerZRightVectorForce = dragAlongPlayerZRightVectorForce;

    let netAlongPlayerXFrontVectorForce = (player.oldVelocity.alongPlayerXFrontVector==0 && Math.abs(appliedAlongPlayerXFrontVectorForce)<=Math.abs(resistiveAlongPlayerXFrontVectorForce)) ? 0 : appliedAlongPlayerXFrontVectorForce - Math.sign(appliedAlongPlayerXFrontVectorForce) * Math.abs(resistiveAlongPlayerXFrontVectorForce);
    let netAlongPlayerXBackVectorForce = (player.oldVelocity.alongPlayerXBackVector==0 && Math.abs(appliedAlongPlayerXBackVectorForce)<=Math.abs(resistiveAlongPlayerXBackVectorForce)) ? 0 : appliedAlongPlayerXBackVectorForce - Math.sign(appliedAlongPlayerXBackVectorForce) * Math.abs(resistiveAlongPlayerXBackVectorForce);
    let netAlongPlayerYFrontVectorForce = (player.oldVelocity.alongPlayerYFrontVector==0 && Math.abs(appliedAlongPlayerYFrontVectorForce)<=Math.abs(resistiveAlongPlayerYFrontVectorForce)) ? 0 : appliedAlongPlayerYFrontVectorForce - Math.sign(appliedAlongPlayerYFrontVectorForce) * Math.abs(resistiveAlongPlayerYFrontVectorForce);
    let netAlongPlayerYBackVectorForce = (player.oldVelocity.alongPlayerYBackVector==0 && Math.abs(appliedAlongPlayerYBackVectorForce)<=Math.abs(resistiveAlongPlayerYBackVectorForce)) ? 0 : appliedAlongPlayerYBackVectorForce - Math.sign(appliedAlongPlayerYBackVectorForce) * Math.abs(resistiveAlongPlayerYBackVectorForce);
    let netAlongPlayerZLeftVectorForce = (player.oldVelocity.alongPlayerZLeftVector==0 && Math.abs(appliedAlongPlayerZLeftVectorForce)<=Math.abs(resistiveAlongPlayerZLeftVectorForce)) ? 0 : appliedAlongPlayerZLeftVectorForce - Math.sign(appliedAlongPlayerZLeftVectorForce) * Math.abs(resistiveAlongPlayerZLeftVectorForce);
    let netAlongPlayerZRightVectorForce = (player.oldVelocity.alongPlayerZRightVector==0 && Math.abs(appliedAlongPlayerZRightVectorForce)<=Math.abs(resistiveAlongPlayerZRightVectorForce)) ? 0 : appliedAlongPlayerZRightVectorForce - Math.sign(appliedAlongPlayerZRightVectorForce) * Math.abs(resistiveAlongPlayerZRightVectorForce);

    player.oldVelocity.alongPlayerXFrontVector += 0.5 * netAlongPlayerXFrontVectorForce * delta_time_ / player.mass;
    player.oldVelocity.alongPlayerXBackVector += 0.5 * netAlongPlayerXBackVectorForce * delta_time_ / player.mass;
    player.oldVelocity.alongPlayerYFrontVector += 0.5 * netAlongPlayerYFrontVectorForce * delta_time_ / player.mass;
    player.oldVelocity.alongPlayerYBackVector += 0.5 * netAlongPlayerYBackVectorForce * delta_time_ / player.mass;
    player.oldVelocity.alongPlayerZLeftVector += 0.5 * netAlongPlayerZLeftVectorForce * delta_time_ / player.mass;
    player.oldVelocity.alongPlayerZRightVector += 0.5 * netAlongPlayerZRightVectorForce * delta_time_ / player.mass;

    console.log(0.5 * netAlongPlayerXFrontVectorForce * delta_time_ / player.mass, 0.5 * netAlongPlayerXBackVectorForce * delta_time_ / player.mass);

    let netAlongPlayerXVectoVelocity = (player.oldVelocity.alongPlayerXFrontVector + player.oldVelocity.alongPlayerXBackVector);
    let netAlongPlayerYVectoVelocity = (player.oldVelocity.alongPlayerYFrontVector + player.oldVelocity.alongPlayerYBackVector);
    let netAlongPlayerZVectoVelocity = (player.oldVelocity.alongPlayerZLeftVector + player.oldVelocity.alongPlayerZRightVector);

    let netAlongPlayerXVectoVelocityVector = oldOrientationXUnitVector.MulNumber(netAlongPlayerXVectoVelocity);
    let netAlongPlayerYVectoVelocityVector = oldOrientationYUnitVector.MulNumber(netAlongPlayerYVectoVelocity);
    let netAlongPlayerZVectoVelocityVector = oldOrientationZUnitVector.MulNumber(netAlongPlayerZVectoVelocity);

    player.oldVelocityVector = netAlongPlayerXVectoVelocityVector.AddVector(netAlongPlayerYVectoVelocityVector.vector).AddVector(netAlongPlayerZVectoVelocityVector.vector);
    let playerYawAngularVelocity = (player.oldVelocity.alongPlayerXFrontVector -  player.oldVelocity.alongPlayerXBackVector) / (2 * player.distanceToStabilizers);

    //player.oldSpeedVector = player.oldSpeedVector.AddVector(newSpeedVector.vector)
    player.position = player.position.AddVector(player.oldVelocityVector.MulNumber(delta_time_).vector)
    //player.oldSpeedVector = player.oldSpeedVector.AddVector(newSpeedVector.vector)
    //player.orientation = player.orientation.MulMatrix(math.MATRIX.CreateRotationMatrix(-1*playerYawAngularVelocity*delta_time_, player.orientation.matrix[1]).matrix);

    //console.log(player.oldVelocityVector.vector, player.oldVelocity.alongPlayerXFrontVector, player.oldVelocity.alongPlayerXBackVector);//, netAlongPlayerXFrontVectorForce, relativeWindSpeed);

    player.orientation.Orthonormalized();
    if (player.position.vector[1] < 1) player.position.vector[1] = 1;
    if (player.position.vector[0] > world.size/4) player.position.vector[0] += -world.size/2;
    if (player.position.vector[0] < -world.size/4) player.position.vector[0] += world.size/2;
    if (player.position.vector[2] > world.size/4) player.position.vector[2] += -world.size/2;
    if (player.position.vector[2] < -world.size/4) player.position.vector[2] += world.size/2;

    let cameraRotationMatrix = math.MATRIX.CreateRotationMatrix(Math.PI, oldOrientationYUnitVector.vector)
    let cameraMatrix = player.orientation.MulMatrix(cameraRotationMatrix.matrix);
    for (i=0; i<4; i++) cameraMatrix.matrix[3][i] = player.position.vector[i];
    viewMatrix = cameraMatrix.Inverse();

    webgl.Draw(player.projectionMatrix, viewMatrix);
    
}

const main = function()
{
    canvas = document.querySelector("canvas");
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    gamePad = new input.GAME_PAD();
    keyBuffer = new input.KEY_BUFFER();
    gameLoop = new output.GAME_LOOP(OnStart, OnUpdate);
    gameLoop.Start();
}