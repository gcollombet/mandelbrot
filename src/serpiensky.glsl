void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Normalisation des coordonnées
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv = uv * 2.0 - 1.0;
    uv *= min(iResolution.x, iResolution.y) / iResolution.y;

    // --- Paramètres du zoom ---
    float zoomSpeed = 10.0;
    float zoom = pow(1.05, iTime * zoomSpeed);

    // Point de zoom
    vec2 zoomPoint = vec2(0.0, 0.0);
    uv = (uv - zoomPoint) / zoom + zoomPoint;

    // --- Calcul dynamique du nombre d'itérations ---
    int maxIter = 1000;
    float iterF = 7.0 + log(zoom) / log(3.0);
    int iter = int(clamp(iterF, 3.0, 1000.0));  // Limite entre 3 et 12

    // Fractale Sierpiński + profondeur
    vec2 p = abs(uv);
    bool hole = false;
    int depth = 0;
    for(int i = 0; i < maxIter; i++) { // 12 = max possible
        if(mod(p.x, 3.0) > 1.0 && mod(p.y, 3.0) > 1.0) {
            hole = true;
            depth = i;
            break;
        }
        p *= 3.0;
    }

    // Dégradé de fond
    vec3 bg = mix(vec3(0.1,0.2,0.3), vec3(0.8,0.9,1.0), uv.y*0.5+0.5);

    // Couleur dynamique pour les trous
    float t = float(depth) / float(iter);
    vec3 color = 0.5 + 0.5*cos(6.2831*(t+vec3(0.0,0.33,0.67))+iTime*0.2);



    fragColor = hole ? vec4(color,1.0) : vec4(bg,1.0);
}
