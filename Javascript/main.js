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
        this.oldSpeedVector = new math.VECTOR();
        this.mass = 100.0;
        this.dragCoefficient = {front: 0.5, back: 1.14, topAndBottom: 1.28, leftAndRight: 0.8};
        this.engineRPM = 0;
        this.propellerRadius = 1;
        this.ignitionOn = false;
        this.aileronPosition = 0.0; //roll
        this.elevatorPosition = 0.0; //pitch
        this.rudderPosition = 0.0; //yaw
        this.throttlePosition = 0;
    }
    
}

class WORLD
{
    constructor()
    {
        this.size = 1000;
        this.fieldSize = this.size/10;

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

    let oldOrientationXUnitVector = new math.VECTOR(player.orientation.matrix[0][0], player.orientation.matrix[0][1], player.orientation.matrix[0][2]);
    let oldOrientationYUnitVector = new math.VECTOR(player.orientation.matrix[1][0], player.orientation.matrix[1][1], player.orientation.matrix[1][2]);
    let oldOrientationZUnitVector = new math.VECTOR(player.orientation.matrix[2][0], player.orientation.matrix[2][1], player.orientation.matrix[2][2]);

    //console.log(oldOrientationZUnitVector.CrossProduct(oldOrientationXUnitVector.vector).vector, oldOrientationXUnitVector.vector, oldOrientationYUnitVector.vector, oldOrientationZUnitVector.vector)

    let oldPlayerSpeedSquared = player.oldSpeedVector.magnitudeSquared();
    let oldPlayerSpeedUnitVector = player.oldSpeedVector.Normalise();
    if (oldPlayerSpeedSquared === 0) oldPlayerSpeedUnitVector = oldOrientationZUnitVector;

    let windSpeed = world.windSpeedVector.magnitude();
    let windSpeedSquared = world.windSpeedVector.magnitudeSquared();

    let relativeWindSpeedVector = player.oldSpeedVector.MulNumber(-1).AddVector(world.windSpeedVector.vector);
    let relativeWindSpeed = relativeWindSpeedVector.magnitude();
    let relativeWindSpeedSquared = relativeWindSpeedVector.magnitudeSquared();
    let relativeWindSpeedUnitVector = relativeWindSpeedVector.Normalise();

    let windAlongPlayerXVectorSpeed = world.windSpeedVector.Projection(oldOrientationXUnitVector.MulNumber(windSpeed).vector);
    let windAlongPlayerYVectorSpeed = world.windSpeedVector.Projection(oldOrientationYUnitVector.MulNumber(windSpeed).vector);
    let windAlongPlayerZVectorSpeed = world.windSpeedVector.Projection(oldOrientationZUnitVector.MulNumber(windSpeed).vector);

    let relativeWindAlongPlayerXVectorSpeed = relativeWindSpeedVector.Projection(oldOrientationXUnitVector.MulNumber(relativeWindSpeed).vector);
    let relativeWindAlongPlayerYVectorSpeed = relativeWindSpeedVector.Projection(oldOrientationYUnitVector.MulNumber(relativeWindSpeed).vector);
    let relativeWindAlongPlayerZVectorSpeed = relativeWindSpeedVector.Projection(oldOrientationZUnitVector.MulNumber(relativeWindSpeed).vector);

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

    console.log(angleOfAttackOnPlaneOfoldOrientationYZ * 180/Math.PI, angleOfAttackOnPlaneOfoldOrientationXZ * 180/Math.PI, relativeWindSpeedUnitVector.vector, relativeWindSpeedUnitVector.Equal(oldOrientationXUnitVector.vector), relativeWindSpeedUnitVector.vector, oldOrientationXUnitVector.vector);

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
    
    //wind force = 1/2 * C * p * Area * SpeedSquared
    let windAlongPlayerXVectorForce = 0.5 * player.dragCoefficient.leftAndRight * world.airDensity * 5 * windAlongPlayerXVectorSpeed;
    let windAlongPlayerXVectorForceUnitVector = oldOrientationXUnitVector;
    let windAlongPlayerXVectorForceVector = windAlongPlayerXVectorForceUnitVector.MulNumber(windAlongPlayerXVectorForce);
    let windAlongPlayerYVectorForce = 0.5 * player.dragCoefficient.topAndBottom * world.airDensity * 5 * windAlongPlayerYVectorSpeed;
    let windAlongPlayerYVectorForceUnitVector = oldOrientationYUnitVector;
    let windAlongPlayerYVectorForceVector = windAlongPlayerYVectorForceUnitVector.MulNumber(windAlongPlayerYVectorForce);
    let windAlongPlayerZVectorForce = 0.5 * ((windAlongPlayerZVectorSpeed < 0) ? player.dragCoefficient.front : player.dragCoefficient.back) * world.airDensity * 5 * windAlongPlayerZVectorSpeed;
    let windAlongPlayerZVectorForceUnitVector = oldOrientationZUnitVector;
    let windAlongPlayerZVectorForceVector = windAlongPlayerZVectorForceUnitVector.MulNumber(windAlongPlayerZVectorForce);
    let windForceVector = windAlongPlayerXVectorForceVector.AddVector(windAlongPlayerYVectorForceVector.vector).AddVector(windAlongPlayerZVectorForceVector.vector);

    //Induced Drag Coefficient = lift Coefficient^2 / (pi * AR * e)
    let inducedDragCoefficient = liftCoefficient * liftCoefficient / (Math.PI*2.5*2.5*0.7)
    //Drag force = 1/2 * C * p * Area * SpeedSquared
    let dragAlongPlayerXVectorForce = 0.5 * player.dragCoefficient.leftAndRight * world.airDensity * 5 * relativeWindAlongPlayerXVectorSpeed;
    let dragAlongPlayerXVectorForceUnitVector = oldOrientationXUnitVector;
    let dragAlongPlayerXVectorForceVector = dragAlongPlayerXVectorForceUnitVector.MulNumber(dragAlongPlayerXVectorForce);
    let dragAlongPlayerYVectorForce = 0.5 * player.dragCoefficient.topAndBottom * world.airDensity * 5 * relativeWindAlongPlayerYVectorSpeed;
    let dragAlongPlayerYVectorForceUnitVector = oldOrientationYUnitVector;
    let dragAlongPlayerYVectorForceVector = dragAlongPlayerYVectorForceUnitVector.MulNumber(dragAlongPlayerYVectorForce);
    let dragAlongPlayerZVectorForce = 0.5 * (((relativeWindAlongPlayerZVectorSpeed < 0) ? player.dragCoefficient.front : player.dragCoefficient.back) + inducedDragCoefficient) * world.airDensity * 5 * relativeWindAlongPlayerZVectorSpeed;
    let dragAlongPlayerZVectorForceUnitVector = oldOrientationZUnitVector;
    let dragAlongPlayerZVectorForceVector = dragAlongPlayerZVectorForceUnitVector.MulNumber(dragAlongPlayerZVectorForce);
    
    let dragForceVector = dragAlongPlayerXVectorForceVector.AddVector(dragAlongPlayerYVectorForceVector.vector).AddVector(dragAlongPlayerZVectorForceVector.vector);

    //console.log(player.oldSpeedVector.vector);

    let netForceVector = windForceVector.AddVector(dragForceVector.vector).AddVector(thrustForceVector.vector);

    let newSpeedVector = netForceVector.MulNumber(0.5*delta_time_/player.mass*0.5)
    player.oldSpeedVector = player.oldSpeedVector.AddVector(newSpeedVector.vector)
    player.position = player.position.AddVector(player.oldSpeedVector.MulNumber(delta_time_).vector)
    player.oldSpeedVector = player.oldSpeedVector.AddVector(newSpeedVector.vector)

    //console.log(player.position.vector);

    //player.orientation.Orthonormalized(Math.PI, );
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