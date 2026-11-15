import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, animate } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ delay = 0, y = 24, className, children, as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/** Parent for a group of <StaggerItem>s that appear one after another. */
export function Stagger({ className, children, gap = 0.08 }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-60px' }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={{
        hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Wraps a page so it eases in when the route changes. */
export function PageTransition({ children }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to `value` when it scrolls into view. */
export function CountUp({ value, decimals = 0, prefix = '', suffix = '', className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduce = useReducedMotion();
  const target = Number(value) || 0;
  const [shown, setShown] = useState(reduce ? target : 0);

  useEffect(() => {
    if (!inView) return undefined;
    if (reduce) {
      setShown(target);
      return undefined;
    }
    const controls = animate(0, target, { duration: 1.4, ease: EASE, onUpdate: setShown });
    return () => controls.stop();
  }, [inView, target, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {shown.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
