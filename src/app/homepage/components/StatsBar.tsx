'use client';

import React, { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: 50000, suffix: '+', label: 'Happy Customers', icon: '😊' },
  { value: 500, suffix: '+', label: 'Plant Varieties', icon: '🌿' },
  { value: 4.8, suffix: '', label: 'Average Rating', icon: '⭐', isFloat: true },
  { value: 98, suffix: '%', label: 'Live Delivery Rate', icon: '🚚' },
  { value: 25, suffix: '+', label: 'Cities Served', icon: '📍' },
];

function AnimatedNumber({ target, suffix, isFloat }: { target: number; suffix: string; isFloat?: boolean }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1800;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current = Math.min(current + increment, target);
          setCount(isFloat ? parseFloat(current.toFixed(1)) : Math.floor(current));
          if (current >= target) clearInterval(timer);
        }, duration / steps);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, isFloat]);

  return <span ref={ref}>{isFloat ? count.toFixed(1) : count.toLocaleString('en-IN')}{suffix}</span>;
}

export default function StatsBar() {
  return (
    <section className="bg-primary py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-white/15">
          {STATS.map((stat, i) => (
            <div key={i} className="flex flex-col items-center py-2 md:py-0 gap-1">
              <span className="text-2xl md:text-xl">{stat.icon}</span>
              <div className="text-2xl md:text-3xl font-bold font-headline text-white">
                <AnimatedNumber target={stat.value} suffix={stat.suffix} isFloat={stat.isFloat} />
              </div>
              <div className="text-xs text-accent font-semibold text-center">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}