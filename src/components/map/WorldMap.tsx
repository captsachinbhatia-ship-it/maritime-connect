import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { Vessel, MapEnquiry, PortPda } from '@/types/maritime';
import { MarkerPopup } from './MarkerPopup';

// Region → center [lng, lat] + zoom scale
const REGION_ZOOM: Record<string, { center: [number, number]; scale: number }> = {
  ALL: { center: [30, 15], scale: 1 },
  ME:  { center: [52, 24], scale: 4 },
  SA:  { center: [105, 5], scale: 4 },
  FE:  { center: [125, 32], scale: 3.5 },
  EU:  { center: [10, 50], scale: 4 },
  AM:  { center: [-80, 25], scale: 3 },
  AF:  { center: [20, 5], scale: 3 },
};

interface WorldMapProps {
  vessels: Vessel[];
  enquiries: MapEnquiry[];
  ports: PortPda[];
  regionFilter: string;
  showVessels: boolean;
  showEnquiries: boolean;
  showPorts: boolean;
  onFindVessels?: (enquiry: MapEnquiry) => void;
}

type PopupData =
  | { type: 'vessel'; data: Vessel; x: number; y: number }
  | { type: 'enquiry'; data: MapEnquiry; x: number; y: number }
  | { type: 'port'; data: PortPda; x: number; y: number }
  | null;

export function WorldMap({
  vessels, enquiries, ports,
  regionFilter, showVessels, showEnquiries, showPorts,
  onFindVessels,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popup, setPopup] = useState<PopupData>(null);
  const [topoData, setTopoData] = useState<any>(null);

  // Load world atlas from CDN
  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(data => setTopoData(data))
      .catch(err => console.error('Failed to load world atlas:', err));
  }, []);

  // Render map
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    setPopup(null);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;
    svg.attr('width', width).attr('height', height);

    // Region-based projection
    const rz = REGION_ZOOM[regionFilter] || REGION_ZOOM.ALL;
    const baseScale = width / 5.5;

    const projection = d3.geoNaturalEarth1()
      .scale(baseScale * rz.scale)
      .center(rz.center)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // --- Zoom behaviour ---
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 12])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setPopup(null);
      });

    svg.call(zoom);

    // Background
    g.append('rect')
      .attr('width', width * 4).attr('height', height * 4)
      .attr('x', -width * 1.5).attr('y', -height * 1.5)
      .attr('fill', '#0c2236');

    // Land
    const countries = feature(topoData as Topology, (topoData as any).objects.countries) as any;
    g.append('g')
      .selectAll('path')
      .data(countries.features)
      .join('path')
      .attr('d', path as any)
      .attr('fill', '#162d42')
      .attr('stroke', '#1e3a52')
      .attr('stroke-width', 0.5);

    const filterRegion = (r: string | null) => regionFilter === 'ALL' || r === regionFilter;

    // Enquiry arcs
    if (showEnquiries) {
      const filteredEnq = enquiries.filter(e =>
        filterRegion(e.load_region) || filterRegion(e.disch_region)
      );
      filteredEnq.forEach(enq => {
        if (enq.load_lat == null || enq.load_lng == null || enq.disch_lat == null || enq.disch_lng == null) return;
        const src = projection([enq.load_lng, enq.load_lat]);
        const dst = projection([enq.disch_lng, enq.disch_lat]);
        if (!src || !dst) return;

        const color = enq.status === 'fixed' ? '#3b82f6' : enq.status === 'pending' ? '#f59e0b' : '#22c55e';
        const midX = (src[0] + dst[0]) / 2;
        const midY = (src[1] + dst[1]) / 2 - Math.abs(src[0] - dst[0]) * 0.15;

        g.append('path')
          .attr('d', `M ${src[0]},${src[1]} Q ${midX},${midY} ${dst[0]},${dst[1]}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3')
          .attr('opacity', 0.7)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            const [x, y] = d3.pointer(event, svgRef.current);
            setPopup({ type: 'enquiry', data: enq, x, y });
          });

        // Load port dot
        g.append('circle')
          .attr('cx', src[0]).attr('cy', src[1]).attr('r', 4)
          .attr('fill', color).attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            const [x, y] = d3.pointer(event, svgRef.current);
            setPopup({ type: 'enquiry', data: enq, x, y });
          });

        // Disch port dot
        g.append('circle')
          .attr('cx', dst[0]).attr('cy', dst[1]).attr('r', 3)
          .attr('fill', color).attr('opacity', 0.6);
      });
    }

    // Vessel markers (amber pulsing circles)
    if (showVessels) {
      const filteredV = vessels.filter(v => v.lat != null && v.lng != null && filterRegion(v.region));
      filteredV.forEach(vessel => {
        const pos = projection([vessel.lng!, vessel.lat!]);
        if (!pos) return;

        // Pulse ring
        g.append('circle')
          .attr('cx', pos[0]).attr('cy', pos[1]).attr('r', 10)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 1)
          .attr('opacity', 0.3);

        // Main dot
        g.append('circle')
          .attr('cx', pos[0]).attr('cy', pos[1]).attr('r', 5)
          .attr('fill', '#f59e0b')
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            const [x, y] = d3.pointer(event, svgRef.current);
            setPopup({ type: 'vessel', data: vessel, x, y });
          });
      });
    }

    // Port markers (blue squares)
    if (showPorts) {
      const filteredP = ports.filter(p => p.lat != null && p.lng != null && filterRegion(p.region));
      filteredP.forEach(port => {
        const pos = projection([port.lng!, port.lat!]);
        if (!pos) return;

        g.append('rect')
          .attr('x', pos[0] - 4).attr('y', pos[1] - 4)
          .attr('width', 8).attr('height', 8)
          .attr('fill', '#3b82f6')
          .attr('opacity', 0.85)
          .attr('rx', 1)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            const [x, y] = d3.pointer(event, svgRef.current);
            setPopup({ type: 'port', data: port, x, y });
          });
      });
    }
  }, [topoData, vessels, enquiries, ports, regionFilter, showVessels, showEnquiries, showPorts]);

  return (
    <div ref={containerRef} className="relative w-full h-[600px] rounded-lg overflow-hidden bg-[#0b1929]">
      <svg ref={svgRef} className="w-full h-full" />
      {popup && (
        <MarkerPopup
          type={popup.type}
          data={popup.data}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
          onFindVessels={popup.type === 'enquiry' && onFindVessels
            ? () => { onFindVessels(popup.data as MapEnquiry); setPopup(null); }
            : undefined
          }
        />
      )}
    </div>
  );
}
