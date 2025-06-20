import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const TransactionRain = ({ transactions = [], isActive = true }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const animationIdRef = useRef(null);
    const rainDropsRef = useRef([]);

    console.log('TransactionRain component rendered with:', {
        transactionsCount: transactions.length,
        isActive,
        transactions: transactions.slice(0, 3) // Log first 3 transactions for debugging
    });

    useEffect(() => {
        console.log('TransactionRain useEffect triggered');
        if (!mountRef.current) {
            console.warn('mountRef.current is null');
            return;
        }

        console.log('Setting up Three.js scene...');

        try {
            // Scene setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0a0a); // Dark background
            sceneRef.current = scene;

            // Camera setup
            const camera = new THREE.PerspectiveCamera(
                75,
                mountRef.current.clientWidth / mountRef.current.clientHeight,
                0.1,
                1000
            );
            camera.position.z = 50;

            // Renderer setup
            const renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Clear any existing children
            while (mountRef.current.firstChild) {
                mountRef.current.removeChild(mountRef.current.firstChild);
            }

            mountRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            console.log('Three.js scene created successfully');

            // Create particle system for transaction rain
            const createRainDrop = (tx = null) => {
                // Different geometries for different transaction types
                let geometry;
                let material;

                if (tx) {
                    const txType = getTransactionType(tx);
                    switch (txType) {
                        case 'Transfer':
                            geometry = new THREE.SphereGeometry(0.1, 8, 8);
                            material = new THREE.MeshPhongMaterial({
                                color: 0x00ff88,
                                emissive: 0x001122,
                                transparent: true,
                                opacity: 0.8
                            });
                            break;
                        case 'Swap':
                            geometry = new THREE.OctahedronGeometry(0.12);
                            material = new THREE.MeshPhongMaterial({
                                color: 0xff6b9d,
                                emissive: 0x221122,
                                transparent: true,
                                opacity: 0.8
                            });
                            break;
                        case 'Mint':
                            geometry = new THREE.TetrahedronGeometry(0.15);
                            material = new THREE.MeshPhongMaterial({
                                color: 0x4a9eff,
                                emissive: 0x112244,
                                transparent: true,
                                opacity: 0.8
                            });
                            break;
                        case 'Burn':
                            geometry = new THREE.ConeGeometry(0.1, 0.3, 6);
                            material = new THREE.MeshPhongMaterial({
                                color: 0xff4a4a,
                                emissive: 0x441111,
                                transparent: true,
                                opacity: 0.8
                            });
                            break;
                        case 'Stake':
                            geometry = new THREE.CylinderGeometry(0.08, 0.08, 0.25, 8);
                            material = new THREE.MeshPhongMaterial({
                                color: 0xa4ff4a,
                                emissive: 0x224411,
                                transparent: true,
                                opacity: 0.8
                            });
                            break;
                        default:
                            geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
                            material = new THREE.MeshPhongMaterial({
                                color: 0x888888,
                                emissive: 0x111111,
                                transparent: true,
                                opacity: 0.6
                            });
                    }
                } else {
                    // Default rain drop
                    geometry = new THREE.SphereGeometry(0.05, 6, 6);
                    material = new THREE.MeshPhongMaterial({
                        color: 0x4488ff,
                        emissive: 0x001144,
                        transparent: true,
                        opacity: 0.6
                    });
                }

                const mesh = new THREE.Mesh(geometry, material);

                // Random starting position
                mesh.position.x = (Math.random() - 0.5) * 80;
                mesh.position.y = 40 + Math.random() * 20;
                mesh.position.z = (Math.random() - 0.5) * 20;

                // Random rotation
                mesh.rotation.x = Math.random() * Math.PI;
                mesh.rotation.y = Math.random() * Math.PI;

                // Rain properties
                mesh.userData = {
                    velocity: 0.2 + Math.random() * 0.3,
                    rotationSpeed: {
                        x: (Math.random() - 0.5) * 0.1,
                        y: (Math.random() - 0.5) * 0.1,
                        z: (Math.random() - 0.5) * 0.1
                    },
                    transaction: tx,
                    life: 1.0
                };

                return mesh;
            };

            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(0, 20, 10);
            directionalLight.castShadow = true;
            scene.add(directionalLight);

            // Point lights for atmosphere
            const pointLight1 = new THREE.PointLight(0x00ff88, 0.5, 50);
            pointLight1.position.set(-20, 10, 0);
            scene.add(pointLight1);

            const pointLight2 = new THREE.PointLight(0xff6b9d, 0.5, 50);
            pointLight2.position.set(20, 10, 0);
            scene.add(pointLight2);

            // Create initial rain drops
            for (let i = 0; i < 50; i++) {
                const drop = createRainDrop();
                scene.add(drop);
                rainDropsRef.current.push(drop);
            }

            // Simple transaction type detection (we'll use the same logic as main app)
            const getTransactionType = (tx) => {
                if (!tx || !tx.input || tx.input === '0x') return 'Transfer';

                const inputData = tx.input.toLowerCase();

                // Swap operations
                if (inputData.includes('swap') ||
                    inputData.startsWith('0x38ed1739') ||
                    inputData.startsWith('0x8803dbee') ||
                    inputData.startsWith('0xfb3bdb41')) {
                    return 'Swap';
                }

                // Mint operations
                if (inputData.includes('mint') || inputData.startsWith('0x40c10f19')) {
                    return 'Mint';
                }

                // Burn operations  
                if (inputData.includes('burn') || inputData.startsWith('0x42966c68')) {
                    return 'Burn';
                }

                // Stake operations
                if (inputData.includes('stake') || inputData.startsWith('0xa694fc3a')) {
                    return 'Stake';
                }

                return 'Other';
            };

            // Animation loop
            const animate = () => {
                if (!isActive) return;

                animationIdRef.current = requestAnimationFrame(animate);

                // Update rain drops
                rainDropsRef.current.forEach((drop, index) => {
                    // Move down
                    drop.position.y -= drop.userData.velocity;

                    // Rotate
                    drop.rotation.x += drop.userData.rotationSpeed.x;
                    drop.rotation.y += drop.userData.rotationSpeed.y;
                    drop.rotation.z += drop.userData.rotationSpeed.z;

                    // Fade out as it falls
                    drop.userData.life -= 0.005;
                    drop.material.opacity = Math.max(0, drop.userData.life * 0.8);

                    // Remove and recreate when it falls too low or fades out
                    if (drop.position.y < -40 || drop.userData.life <= 0) {
                        scene.remove(drop);
                        rainDropsRef.current.splice(index, 1);

                        // Create new drop, potentially with real transaction data
                        const newTx = transactions.length > 0 ?
                            transactions[Math.floor(Math.random() * transactions.length)] : null;
                        const newDrop = createRainDrop(newTx);
                        scene.add(newDrop);
                        rainDropsRef.current.push(newDrop);
                    }
                });

                // Camera gentle movement
                const time = Date.now() * 0.001;
                camera.position.x = Math.sin(time * 0.1) * 2;
                camera.position.y = Math.cos(time * 0.15) * 1;

                renderer.render(scene, camera);
            };

            animate();

            // Handle resize function - defined in this scope
            const handleResize = () => {
                if (!mountRef.current || !renderer) return;

                camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
            };

            window.addEventListener('resize', handleResize);

            // Cleanup function
            const cleanup = () => {
                window.removeEventListener('resize', handleResize);
                if (animationIdRef.current) {
                    cancelAnimationFrame(animationIdRef.current);
                }
                if (mountRef.current && renderer && renderer.domElement) {
                    try {
                        mountRef.current.removeChild(renderer.domElement);
                    } catch (e) {
                        console.warn('Error removing renderer element:', e);
                    }
                }
                if (renderer) {
                    renderer.dispose();
                }
            };

            return cleanup;

        } catch (error) {
            console.error('Error setting up Three.js scene:', error);
            return () => { }; // Return empty cleanup function on error
        }
    }, [transactions, isActive]);

    return (
        <div
            ref={mountRef}
            className="w-full h-full relative overflow-hidden rounded-lg bg-gray-900"
            style={{ minHeight: '400px' }}
        >
            {/* Fallback content in case Three.js doesn't load */}
            <div className="absolute inset-0 flex items-center justify-center text-white">
                <div className="text-center">
                    <div className="animate-pulse mb-4">
                        <div className="w-16 h-16 bg-purple-500 rounded-full mx-auto mb-4 opacity-50"></div>
                    </div>
                    <p className="text-sm opacity-75">Loading Transaction Rain...</p>
                    <p className="text-xs opacity-50 mt-2">
                        Transactions: {transactions.length} | Active: {isActive.toString()}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TransactionRain;
