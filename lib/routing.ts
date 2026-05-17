export type RouteStep = {
    instruction: string;
    maneuverType: string;
    maneuverModifier: string;
    distance: number;
    duration: number;
    startCoord: [number, number]; // [lng, lat]
  };

  export type RouteResult = {
    polylineCoords: { latitude: number; longitude: number }[];
    steps: RouteStep[];
    totalDistance: number;
    totalDuration: number;
  };

  function buildInstruction(step: any): string {
    const type: string = step.maneuver.type;
    const mod: string = step.maneuver.modifier ?? '';
    const name = step.name ? ` em ${step.name}` : '';
    if (type === 'depart') return `Siga em frente${name}`;
    if (type === 'arrive') return 'Você chegou ao destino';
    if (type === 'turn' || type === 'end of road') {
      if (mod === 'left' || mod === 'sharp left') return `Vire à esquerda${name}`;
      if (mod === 'right' || mod === 'sharp right') return `Vire à direita${name}`;
      if (mod === 'slight left') return `Curva leve à esquerda${name}`;
      if (mod === 'slight right') return `Curva leve à direita${name}`;
      if (mod === 'uturn') return `Faça o retorno${name}`;
    }
    if (type === 'merge') return `Entre na via${name}`;
    if (type === 'ramp') return mod.includes('left') ? 'Pegue a rampa à esquerda' : 'Pegue a rampa à direita';
    if (type === 'fork') return mod.includes('left') ? 'Mantenha-se à esquerda' : 'Mantenha-se à direita';
    if (type === 'roundabout' || type === 'rotary') return 'Entre na rotatória';
    if (type === 'exit roundabout' || type === 'exit rotary') return `Saia da rotatória${name}`;
    if (type === 'continue') return `Continue em frente${name}`;
    return `Continue em frente${name}`;
  }

  export async function getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteResult | null> {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
      `?overview=full&geometries=geojson&steps=true&annotations=false`;
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'ZeroRiscoApp/1.0' } });
      const data = await resp.json();
      if (!data.routes?.length) return null;
      const route = data.routes[0];
      const leg = route.legs[0];
      const polylineCoords = (route.geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => ({ latitude: lat, longitude: lng })
      );
      const steps: RouteStep[] = leg.steps.map((s: any) => ({
        instruction: buildInstruction(s),
        maneuverType: s.maneuver.type,
        maneuverModifier: s.maneuver.modifier ?? 'straight',
        distance: s.distance,
        duration: s.duration,
        startCoord: s.maneuver.location as [number, number],
      }));
      return { polylineCoords, steps, totalDistance: route.distance, totalDuration: route.duration };
    } catch (e) {
      console.error('Routing error:', e);
      return null;
    }
  }
  