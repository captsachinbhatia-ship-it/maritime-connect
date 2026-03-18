import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import { Vessel, MapEnquiry, PortPda } from '@/types/maritime';
import { MarkerPopup } from './MarkerPopup';

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

  // Render map when data is ready
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !topoData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;

    svg.attr('width', width).attr('height', height);

    const projection = d3.geoNaturalEarth1()
      .scale(width / 5.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Background
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#0c2236');

    // Land
    const countries = feature(topoData as Topology, (topoData as any).objects.countries) as any;
    svg.append('g')
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
        const midY = (src[1] + dst[1]) / 2 - 30;

        svg.append('path')
          .attr('d', `M ${src[0]},${src[1]} Q ${midX},${midY} ${dst[0]},${dst[1]}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '6,3')
          .attr('opacity', 0.7)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            setPopup({ type: 'enquiry', data: enq, x: event.offsetX, y: event.offsetY });
          });

        // Load port dot
        svg.append('circle')
          .attr('cx', src[0]).attr('cy', src[1]).attr('r', 4)
          .attr('fill', color).attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            setPopup({ type: 'enquiry', data: enq, x: event.offsetX, y: event.offsetY });
          });
      });
    }

    // Vessel markers (amber pulsing circles)
    if (showVessels) {
      const filteredV = vessels.filter(v => v.lat != null && v.lng != null && filterRegion(v.region));
      filteredV.forEach(vessel => {
        const pos = projection([vessel.lng!, vessel.lat!]);
        if (!pos) return;

        // Pulse ring
        svg.append('circle')
          .attr('cx', pos[0]).attr('cy', pos[1]).attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', '#f59e0b')
          .attr('stroke-width', 1)
          .attr('opacity', 0.4);

        // Main dot
        svg.append('circle')
          .attr('cx', pos[0]).attr('cy', pos[1]).attr('r', 5)
          .attr('fill', '#f59e0b')
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            setPopup({ type: 'vessel', data: vessel, x: event.offsetX, y: event.offsetY });
          });
      });
    }

    // Port markers (blue squares)
    if (showPorts) {
      const filteredP = ports.filter(p => p.lat != null && p.lng != null && filterRegion(p.region));
      filteredP.forEach(port => {
        const pos = projection([port.lng!, port.lat!]);
        if (!pos) return;

        svg.append('rect')
          .attr('x', pos[0] - 4).attr('y', pos[1] - 4)
          .attr('width', 8).attr('height', 8)
          .attr('fill', '#3b82f6')
          .attr('opacity', 0.85)
          .attr('rx', 1)
          .style('cursor', 'pointer')
          .on('click', (event: MouseEvent) => {
            setPopup({ type: 'port', data: port, x: event.offsetX, y: event.offsetY });
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
