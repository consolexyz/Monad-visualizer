import { useEffect, useRef, useState } from 'react';
import MolandakImage from '../assets/Molandak.png';

const CanvasTransactionRain = ({ transactions = [], isActive = true }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const rainDropsRef = useRef([]);
    const lastTransactionCountRef = useRef(0);
    const transactionActivityRef = useRef(0);
    const customImageRef = useRef(null);
    const personPositionRef = useRef(0);
    const personDirectionRef = useRef(1);
    const cloudsRef = useRef([]);

    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 400 });
    const [totalDropsCreated, setTotalDropsCreated] = useState(0);
    const [rainIntensity, setRainIntensity] = useState(0);
    const [customImageLoaded, setCustomImageLoaded] = useState(false);

    // Track transaction activity for dynamic rain speed
    useEffect(() => {
        if (transactions.length > lastTransactionCountRef.current) {
            // Calculate transaction activity (new transactions per update)
            const newTxCount = transactions.length - lastTransactionCountRef.current;
            transactionActivityRef.current = newTxCount;
            lastTransactionCountRef.current = transactions.length;

            // Update rain intensity based on activity (0-10 scale)
            setRainIntensity(Math.min(newTxCount * 2, 10));
        } else {
            // No new transactions, reduce activity gradually
            transactionActivityRef.current = Math.max(0, transactionActivityRef.current - 0.1);
            setRainIntensity(Math.max(0, transactionActivityRef.current));
        }
    }, [transactions]);

    // All transactions are purple
    const getTransactionColor = () => '#9747FF';

    // Create a rain drop with dynamic speed based on activity
    const createRainDrop = (tx = null) => {
        // Speed multiplier: slow when no activity (0.5x), fast when high activity (up to 3x)
        const activityMultiplier = Math.max(0.5, Math.min(3, transactionActivityRef.current / 2));

        return {
            x: Math.random() * canvasSize.width,
            y: -20 - Math.random() * 100,
            speed: (2 + Math.random() * 4) * activityMultiplier, // Dynamic fall speed
            size: 3 + Math.random() * 8,
            color: getTransactionColor(),
            opacity: 0.7 + Math.random() * 0.3,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            transaction: tx,
            trail: []
        };
    };

    // Create a cloud with random properties
    const createCloud = () => {
        return {
            x: -200 - Math.random() * 100, // Start off-screen to the left
            y: 20 + Math.random() * 80, // Top area of canvas
            width: 100 + Math.random() * 120, // Bigger random cloud size (was 60-140, now 100-220)
            height: 50 + Math.random() * 60, // Bigger height (was 30-70, now 50-110)
            speed: 0.2 + Math.random() * 0.3, // Slow moving
            opacity: 0.3 + Math.random() * 0.4, // Semi-transparent
            segments: Math.floor(4 + Math.random() * 5), // More segments for bigger clouds (4-8 instead of 3-6)
            offsetY: Math.random() * 10, // Slight vertical variation
        };
    };

    // Draw a cloud using multiple circles
    const drawCloud = (ctx, cloud) => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        ctx.fillStyle = '#888888'; // Grey color instead of white

        // Draw multiple overlapping circles to create cloud shape
        for (let i = 0; i < cloud.segments; i++) {
            const segmentX = cloud.x + (i * cloud.width / cloud.segments) + Math.sin(Date.now() * 0.001 + i) * 2;
            const segmentY = cloud.y + cloud.offsetY + Math.cos(Date.now() * 0.0015 + i) * 3;
            const radius = cloud.height / 2 + Math.sin(Date.now() * 0.002 + i) * 5;

            ctx.beginPath();
            ctx.arc(segmentX, segmentY, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    };

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const updateCanvasSize = () => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            setCanvasSize({ width: rect.width, height: rect.height });
        };

        updateCanvasSize();
        window.addEventListener('resize', updateCanvasSize);

        // Initialize with some drops
        rainDropsRef.current = [];
        for (let i = 0; i < 20; i++) {
            rainDropsRef.current.push(createRainDrop());
        }

        // Load Molandak image (replaces person)
        const customImg = new Image();
        customImg.onload = () => {
            customImageRef.current = customImg;
            setCustomImageLoaded(true);
        };
        // Use the imported Molandak image
        customImg.src = MolandakImage;

        // Initialize person position (now for Molandak)
        personPositionRef.current = 0;
        personDirectionRef.current = 1;

        return () => window.removeEventListener('resize', updateCanvasSize);
    }, []);

    // Animation loop
    useEffect(() => {
        if (!isActive) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const animate = () => {
            // Clear canvas with trail effect
            ctx.fillStyle = 'rgba(22, 22, 22, 0.1)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Dynamic rain generation based on transaction activity
            const baseDropChance = 0.01; // Minimum rain when no activity (1%)
            const activityDropChance = Math.min(rainIntensity * 0.05, 0.3); // Scale with activity (max 30%)
            const totalDropChance = baseDropChance + activityDropChance;

            // Create new drops based on activity
            if (Math.random() < totalDropChance) {
                const randomTx = transactions.length > 0 ?
                    transactions[Math.floor(Math.random() * transactions.length)] : null;
                rainDropsRef.current.push(createRainDrop(randomTx));
                setTotalDropsCreated(prev => prev + 1);
            }

            // Limit drops for performance
            if (rainDropsRef.current.length > 150) {
                rainDropsRef.current = rainDropsRef.current.slice(-100);
            }

            // Update Molandak position (independent of transaction activity)
            const molandakSpeed = 2; // Fixed slow walking speed, not affected by transactions
            personPositionRef.current += personDirectionRef.current * molandakSpeed;

            // Reverse direction when reaching edges (with Molandak width buffer)
            const molandakWidth = 100; // Bigger size
            if (personPositionRef.current >= canvas.width - molandakWidth) {
                personDirectionRef.current = -1;
                personPositionRef.current = canvas.width - molandakWidth;
            } else if (personPositionRef.current <= 0) {
                personDirectionRef.current = 1;
                personPositionRef.current = 0;
            }

            // Cloud management - randomly create new clouds
            if (Math.random() < 0.003) { // Low chance each frame (~1 every 5-10 seconds)
                cloudsRef.current.push(createCloud());
            }

            // Update and draw clouds
            cloudsRef.current.forEach((cloud, index) => {
                // Move cloud to the right
                cloud.x += cloud.speed;

                // Draw the cloud
                drawCloud(ctx, cloud);

                // Remove clouds that have moved off-screen
                if (cloud.x > canvas.width + cloud.width) {
                    cloudsRef.current.splice(index, 1);
                }
            });

            // Limit number of clouds for performance
            if (cloudsRef.current.length > 8) {
                cloudsRef.current = cloudsRef.current.slice(-6);
            }

            // Update and draw drops
            rainDropsRef.current.forEach((drop, index) => {
                // Update position
                drop.y += drop.speed;
                drop.rotation += drop.rotationSpeed;                // Check collision with Molandak
                const molandakWidth = 100;
                const molandakX = personPositionRef.current + molandakWidth / 2;
                const molandakY = canvas.height - 50; // Adjusted for bottom positioning (center of Molandak)

                // Check Molandak collision
                const distanceToMolandak = Math.sqrt(
                    Math.pow(drop.x - molandakX, 2) + Math.pow(drop.y - molandakY, 2)
                );

                // If drop hits Molandak, bounce it away
                if (distanceToMolandak < molandakWidth / 2 && drop.y > molandakY - 30 && drop.y < molandakY + 10) {
                    const angle = Math.atan2(drop.y - molandakY, drop.x - molandakX);
                    drop.x += Math.cos(angle) * 3;
                    drop.y += Math.sin(angle) * 3;
                    drop.speed *= 0.7;
                }

                // Add trail point
                drop.trail.push({ x: drop.x, y: drop.y, opacity: drop.opacity });
                if (drop.trail.length > 3) drop.trail.shift();

                // Draw trail
                drop.trail.forEach((point, trailIndex) => {
                    const trailOpacity = (trailIndex / drop.trail.length) * drop.opacity * 0.3;
                    ctx.globalAlpha = trailOpacity;
                    ctx.fillStyle = drop.color;
                    ctx.beginPath();
                    ctx.arc(point.x, point.y, drop.size * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Draw main drop
                ctx.globalAlpha = drop.opacity;
                ctx.fillStyle = drop.color;
                ctx.save();
                ctx.translate(drop.x, drop.y);
                ctx.rotate(drop.rotation);
                ctx.beginPath();
                ctx.arc(0, 0, drop.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();

                // Remove drops that fell off screen
                if (drop.y > canvas.height + 50) {
                    const newTx = transactions.length > 0 ?
                        transactions[Math.floor(Math.random() * transactions.length)] : null;
                    rainDropsRef.current[index] = createRainDrop(newTx);
                    setTotalDropsCreated(prev => prev + 1);
                }
            });

            // Draw Molandak at bottom (moving)
            if (customImageLoaded && customImageRef.current) {
                const molandakWidth = 100;
                const molandakHeight = 100;
                const molandakY = canvas.height - molandakHeight + 5; // Push down 5 pixels to ensure no gap
                const molandakX = personPositionRef.current;

                // Draw Molandak
                ctx.globalAlpha = 0.9;
                ctx.drawImage(
                    customImageRef.current,
                    molandakX,
                    molandakY,
                    molandakWidth,
                    molandakHeight
                );
            }

            ctx.globalAlpha = 1;
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isActive, transactions, rainIntensity, canvasSize, customImageLoaded]);

    return (
        <div className="w-full h-full relative">
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-lg"
                style={{ background: '#161616' }}
            />

            {/* Activity-based info overlay */}
            <div className="absolute top-4 left-4 text-white text-sm">
                <div className="bg-black bg-opacity-50 rounded px-3 py-2">
                    <p className="text-xs mt-1 text-gray-300">
                        {rainIntensity < 1 ? "Light Rain" :
                            rainIntensity < 3 ? "Moderate Rain" :
                                rainIntensity < 6 ? "Heavy Rain" : "Storm!"}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CanvasTransactionRain;
