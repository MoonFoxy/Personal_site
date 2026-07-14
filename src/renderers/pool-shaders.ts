const poolFragmentBody = String.raw`
    VARYING vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_dayProgress;
    uniform float u_daylight;
    uniform float u_sunAzimuth;
    uniform float u_sunElevation;
    uniform float u_sunIntensity;

    const float PI = 3.141592653589793;
    const float HALF_PI = 1.570796326794897;
    const float WATER_IOR = 1.333;
    const float AIR_TO_WATER = 1.0 / WATER_IOR;

    float saturateValue(float value) {
        return clamp(value, 0.0, 1.0);
    }

    float hash21(vec2 point) {
        point = fract(point * vec2(123.34, 456.21));
        point += vec2(dot(point, point + vec2(45.32)));
        return fract(point.x * point.y);
    }

    mat2 outerSquare(vec2 value) {
        return mat2(
            value.x * value.x,
            value.x * value.y,
            value.x * value.y,
            value.y * value.y
        );
    }

    float determinant2(mat2 value) {
        return value[0][0] * value[1][1] - value[1][0] * value[0][1];
    }

    // Every wave is gently bent across its travel direction. The returned
    // surface and Hessian are analytic, so refraction, shadow pockets and
    // caustic focusing remain part of the same moving body of water.
    void addBentWave(
        vec2 point,
        vec2 direction,
        float frequency,
        float amplitude,
        float speed,
        float bendFrequency,
        float bendAmount,
        float bendSpeed,
        float timeOffset,
        inout vec4 surface,
        inout mat2 surfaceHessian
    ) {
        vec2 bendDirection = vec2(-direction.y, direction.x);
        float bendAngle = dot(point, bendDirection) * bendFrequency
            + timeOffset * bendSpeed;
        float bendSine = sin(bendAngle);
        float bendCosine = cos(bendAngle);
        float phase = frequency * (
            dot(point, direction) + bendAmount * bendSine
        ) + timeOffset * speed;
        float phaseSine = sin(phase);
        float phaseCosine = cos(phase);
        vec2 phaseGradient = frequency * (
            direction + bendDirection * (bendAmount * bendFrequency * bendCosine)
        );
        mat2 phaseHessian = outerSquare(bendDirection) * (
            -frequency * bendAmount * bendFrequency * bendFrequency * bendSine
        );
        mat2 waveHessian = amplitude * (
            phaseHessian * phaseCosine - outerSquare(phaseGradient) * phaseSine
        );

        surface.x += amplitude * phaseSine;
        surface.yz += amplitude * phaseCosine * phaseGradient;
        surface.w += waveHessian[0][0] + waveHessian[1][1];
        surfaceHessian += waveHessian;
    }

    vec4 samplePoolSurface(vec2 point, float timeOffset, out mat2 surfaceHessian) {
        vec4 surface = vec4(0.0);
        surfaceHessian = mat2(0.0);

        // Four low pool swells plus two capillary ripples. The RMS surface
        // slope is deliberately kept near 0.014: through water at IOR 1.333
        // that moves a grout line by roughly 0.09 of a five-centimetre tile,
        // rather than bending the whole floor into screen-sized S curves.
        // Higher-frequency ripples retain enough curvature for local caustics
        // without requiring a large visible displacement.
        addBentWave(point, vec2(0.970, 0.243), 7.2, 0.00136, 0.47, 3.1, 0.0100, -0.19, timeOffset, surface, surfaceHessian);
        addBentWave(point, vec2(-0.358, 0.934), 9.6, 0.00104, -0.41, 4.3, 0.0080, 0.23, timeOffset, surface, surfaceHessian);
        addBentWave(point, vec2(0.652, -0.758), 13.3, 0.00068, 0.35, 5.4, 0.0060, -0.31, timeOffset, surface, surfaceHessian);
        addBentWave(point, vec2(-0.902, -0.432), 17.4, 0.00042, -0.29, 6.8, 0.0040, 0.37, timeOffset, surface, surfaceHessian);
        addBentWave(point, vec2(0.122, 0.993), 33.0, 0.00020, 0.82, 9.6, 0.0020, -0.71, timeOffset, surface, surfaceHessian);
        addBentWave(point, vec2(-0.748, 0.664), 52.0, 0.000096, -1.07, 12.4, 0.0015, 0.93, timeOffset, surface, surfaceHessian);
        return surface;
    }

    float bayer4(vec2 fragmentPosition) {
        vec2 cell = mod(floor(fragmentPosition), 4.0);
        float value = 0.0;

        if (cell.y < 1.0) {
            if (cell.x < 1.0) value = 0.0;
            else if (cell.x < 2.0) value = 8.0;
            else if (cell.x < 3.0) value = 2.0;
            else value = 10.0;
        } else if (cell.y < 2.0) {
            if (cell.x < 1.0) value = 12.0;
            else if (cell.x < 2.0) value = 4.0;
            else if (cell.x < 3.0) value = 14.0;
            else value = 6.0;
        } else if (cell.y < 3.0) {
            if (cell.x < 1.0) value = 3.0;
            else if (cell.x < 2.0) value = 11.0;
            else if (cell.x < 3.0) value = 1.0;
            else value = 9.0;
        } else {
            if (cell.x < 1.0) value = 15.0;
            else if (cell.x < 2.0) value = 7.0;
            else if (cell.x < 3.0) value = 13.0;
            else value = 5.0;
        }

        return (value + 0.5) / 16.0 - 0.5;
    }

    float distributionGGX(float normalHalf, float roughness) {
        float alpha = roughness * roughness;
        float alphaSquared = alpha * alpha;
        float denominator = normalHalf * normalHalf * (alphaSquared - 1.0) + 1.0;
        return alphaSquared / max(PI * denominator * denominator, 0.0001);
    }

    float geometrySchlickGGX(float normalDirection, float roughness) {
        float radius = roughness + 1.0;
        float k = (radius * radius) * 0.125;
        return normalDirection / max(normalDirection * (1.0 - k) + k, 0.0001);
    }

    void main() {
        float aspect = u_resolution.x / max(u_resolution.y, 1.0);
        float daylight = saturateValue(u_daylight);
        float sunStrength = saturateValue(u_sunIntensity);
        float elevation = clamp(u_sunElevation, 0.0, HALF_PI);
        vec2 poolPoint = vec2((v_uv.x - 0.5) * aspect, v_uv.y - 0.5);

        mat2 surfaceHessian;
        vec4 surface = samplePoolSurface(poolPoint, u_time, surfaceHessian);
        vec3 surfaceNormal = normalize(vec3(-surface.y, -surface.z, 1.0));
        vec3 viewDirection = vec3(0.0, 0.0, 1.0);

        // Refract the top-down viewing ray through water onto the tiled floor.
        vec3 floorRay = refract(vec3(0.0, 0.0, -1.0), surfaceNormal, AIR_TO_WATER);
        float opticalDepth = 1.24 + surface.x * 2.2;
        vec2 floorPoint = poolPoint
            + floorRay.xy / max(-floorRay.z, 0.2) * (opticalDepth * 0.96);

        // Five-centimetre world cells produce about twenty square tiles over
        // the short viewport axis, matching the supplied top-down reference.
        vec2 tileSize = vec2(0.050);
        vec2 tileCoordinates = floorPoint / tileSize;
        vec2 tileCell = floor(tileCoordinates);
        vec2 tileLocal = fract(tileCoordinates);
        vec2 tileEdge = min(tileLocal, 1.0 - tileLocal);
        float edgeDistance = min(tileEdge.x, tileEdge.y);
        float tilePixelWidth = 1.0 / max(
            min(u_resolution.x, u_resolution.y) * tileSize.x,
            1.0
        );
        float grout = 1.0 - smoothstep(
            0.020,
            0.020 + tilePixelWidth * 1.15,
            edgeDistance
        );

        float tileVariation = hash21(tileCell) - 0.5;
        float tileVariationB = hash21(tileCell + vec2(17.3, 41.7)) - 0.5;
        vec3 nightTile = vec3(0.030, 0.135, 0.230);
        vec3 dayTile = vec3(0.075, 0.455, 0.630);
        vec3 nightGrout = vec3(0.125, 0.335, 0.405);
        vec3 dayGrout = vec3(0.520, 0.760, 0.775);
        vec3 tileColor = mix(nightTile, dayTile, daylight);
        tileColor *= 1.0 + tileVariation * 0.16;
        tileColor += vec3(-0.010, 0.010, 0.028) * tileVariationB;
        vec3 floorColor = mix(
            tileColor,
            mix(nightGrout, dayGrout, daylight),
            grout * 0.94
        );
        float clockSweep = 0.5 + 0.5 * cos(
            floorPoint.x * 0.72 + floorPoint.y * 0.31 - u_dayProgress * PI * 2.0
        );
        // Keep the time-of-day sweep below the caustic detail. A stronger
        // modulation reads as a soft light band spanning dozens of tiles.
        floorColor *= 0.994 + clockSweep * 0.006;

        // Beer-Lambert attenuation gives the floor real perceived depth.
        vec3 absorption = mix(vec3(0.62, 0.225, 0.090), vec3(0.45, 0.135, 0.052), daylight);
        vec3 transmission = exp(-absorption * opticalDepth);
        vec3 nightScatter = vec3(0.004, 0.035, 0.075);
        vec3 dayScatter = vec3(0.006, 0.195, 0.325);
        vec3 waterScatter = mix(nightScatter, dayScatter, daylight);
        vec3 color = floorColor * transmission + waterScatter * (vec3(1.0) - transmission);

        // The same first-order projection used above gives the floor mapping
        // derivative I - depth * Hessian(height). Its inverse area is the
        // physical focusing term; this stays responsive with shallow ripples
        // instead of requiring unnaturally steep waves. WebGL1 keeps the less
        // expensive trace approximation.
        float refractionScale = opticalDepth * (1.0 - AIR_TO_WATER) * 0.96;
        float caustic = 0.0;
        float shadowPocket = 0.0;
        #ifdef POOL_HQ
            mat2 floorJacobian = mat2(1.0) - surfaceHessian * refractionScale;
            float focusDistance = max(abs(determinant2(floorJacobian)), 0.18);
            float compression = max(1.0 / focusDistance - 1.04, 0.0);
            caustic = 1.0 - exp(-compression * 2.60);
            caustic = pow(caustic, 1.50);
            shadowPocket = smoothstep(1.08, 1.62, focusDistance);
        #else
            float focusTrace = max(abs(1.0 - surface.w * refractionScale * 0.54), 0.20);
            float compression = max(1.0 / focusTrace - 1.045, 0.0);
            caustic = 1.0 - exp(-compression * 2.20);
            caustic = pow(caustic, 1.65) * 0.82;
            shadowPocket = smoothstep(1.08, 1.62, focusTrace);
        #endif
        color *= 1.0 - shadowPocket * mix(0.050, 0.15, sunStrength);
        float causticStrength = sunStrength * mix(0.040, 0.30, daylight);
        vec3 causticColor = mix(
            vec3(0.36, 0.66, 0.78),
            vec3(0.80, 0.965, 0.955),
            daylight
        );
        color += causticColor * caustic * causticStrength * (1.0 - grout * 0.42);

        // Fresnel reflection and a directional GGX solar lobe share the same
        // analytic normal used for refraction and caustics.
        float normalView = max(dot(surfaceNormal, viewDirection), 0.0);
        float f0 = ((WATER_IOR - 1.0) / (WATER_IOR + 1.0));
        f0 *= f0;
        float fresnel = f0 + (1.0 - f0) * pow(1.0 - normalView, 5.0);
        vec3 reflectedSky = mix(vec3(0.010, 0.035, 0.070), vec3(0.210, 0.565, 0.690), daylight);
        color = mix(color, reflectedSky, fresnel * mix(0.72, 1.0, daylight));

        float elevationNormalised = sin(elevation);
        float visualElevation = mix(0.40, 1.28, elevationNormalised);
        vec2 horizontalDirection = vec2(sin(u_sunAzimuth), -cos(u_sunAzimuth));
        vec3 lightDirection = normalize(vec3(
            horizontalDirection * cos(visualElevation),
            sin(visualElevation)
        ));
        vec3 halfDirection = normalize(viewDirection + lightDirection);
        float normalLight = max(dot(surfaceNormal, lightDirection), 0.0);
        float normalHalf = max(dot(surfaceNormal, halfDirection), 0.0);
        float viewHalf = max(dot(viewDirection, halfDirection), 0.0);
        float roughness = mix(0.175, 0.105, daylight);
        float distribution = distributionGGX(normalHalf, roughness);
        float solarFresnel = f0 + (1.0 - f0) * pow(1.0 - viewHalf, 5.0);
        #ifdef POOL_HQ
            float geometry = geometrySchlickGGX(normalView, roughness)
                * geometrySchlickGGX(normalLight, roughness);
            float specular = distribution * geometry * solarFresnel
                / max(4.0 * normalView * normalLight, 0.001);
        #else
            float specular = distribution * solarFresnel * normalLight * 0.72;
        #endif

        float sunScreenX = 0.5 + sin(u_sunAzimuth) * 0.36;
        float sunScreenY = 0.47 - elevationNormalised * 0.13;
        vec2 glintCenter = vec2(sunScreenX, sunScreenY);
        vec2 glintDelta = v_uv - glintCenter;
        float mainGlint = exp(-dot(
            glintDelta * vec2(7.6, 10.5),
            glintDelta * vec2(7.6, 10.5)
        ));
        vec2 satelliteDelta = v_uv - (
            glintCenter + vec2(-0.055, 0.032) * (0.65 + elevationNormalised * 0.35)
        );
        float satelliteGlint = exp(-dot(
            satelliteDelta * vec2(12.0, 15.0),
            satelliteDelta * vec2(12.0, 15.0)
        ));
        float glintEnvelope = max(mainGlint, satelliteGlint * 0.62);
        vec3 warmSun = mix(
            vec3(1.0, 0.77, 0.57),
            vec3(0.94, 1.0, 0.94),
            elevationNormalised
        );
        color += warmSun * min(specular, 2.1) * glintEnvelope * sunStrength * 0.18;

        float edgeShade = 1.0 - smoothstep(0.32, 1.22, length(poolPoint * vec2(0.68, 1.0)));
        color *= 0.95 + edgeShade * 0.05;

        // A sub-one-LSB stable Bayer offset only prevents banding; it is not a
        // visible full-screen texture.
        color += vec3(bayer4(gl_FragCoord.xy) * (0.46 / 255.0));
        color = max(color, vec3(0.0));
        color = vec3(1.0) - exp(-color * 1.08);

        FRAGCOLOR = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
`;

export const poolShaders = {
    webgl2: {
        vertex: `#version 300 es
            in vec2 a_position;
            out vec2 v_uv;

            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `,
        fragment: `#version 300 es
            precision highp float;
            #define POOL_HQ
            #define VARYING in
            out vec4 outColor;
            #define FRAGCOLOR outColor
            ${poolFragmentBody}
        `,
    },
    webgl1: {
        vertex: `
            precision mediump float;
            attribute vec2 a_position;
            varying mediump vec2 v_uv;

            void main() {
                v_uv = a_position * 0.5 + 0.5;
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `,
        fragment: `
            #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
            #else
            precision mediump float;
            #endif
            #define VARYING varying mediump
            #define FRAGCOLOR gl_FragColor
            ${poolFragmentBody}
        `,
    },
} as const;
