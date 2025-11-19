
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { GoogleGenAI } from "@google/genai";

// --- Gemini API Setup ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `You are "TaoLi" (Peach & Plum), an expert AI consultant for a study abroad agency.
Your goal is to help students find their dream university, understand visa processes, and prepare for life abroad.
You are knowledgeable about universities in the US, UK, Australia, Canada, Europe, and Asia.
Keep your answers concise, encouraging, and helpful. Use emojis occasionally.
If asked about the website, explain that you are the 3D guide powered by Gemini.`;

// --- Types ---
type PageView = 'home' | 'schools' | 'process' | 'packages' | 'news' | 'about';
type InteractionType = 'chat' | 'wave' | 'dance' | 'travel' | null;

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface School {
  id: string;
  name: string;
  location: string;
  ranking: string;
  tuition: string;
  tags: string[];
  desc: string;
  icon: string;
}

// --- Data ---
const SCHOOLS_DATA: School[] = [
  { id: 'harvard', name: 'Harvard University', location: 'USA, Cambridge', ranking: '#1 World', tuition: '$54,000/yr', tags: ['Ivy League', 'Research'], icon: '🏛️', desc: 'The oldest institution of higher learning in the United States, known for its history, influence, and wealth.' },
  { id: 'oxford', name: 'University of Oxford', location: 'UK, Oxford', ranking: '#3 World', tuition: '£30,000/yr', tags: ['Historic', 'Collegiate'], icon: '🏰', desc: 'A world-class research university with a unique collegiate system and centuries of academic excellence.' },
  { id: 'toronto', name: 'University of Toronto', location: 'Canada, Toronto', ranking: '#21 World', tuition: 'CAD 60,000/yr', tags: ['Public', 'Innovation'], icon: '🍁', desc: 'Canada’s top university, renowned for its research output and diverse student body.' },
  { id: 'melb', name: 'University of Melbourne', location: 'Australia, Melbourne', ranking: '#14 World', tuition: 'AUD 45,000/yr', tags: ['Group of 8', 'Urban'], icon: '🐨', desc: 'A public research university located in Melbourne, Australia. Founded in 1853.' },
  { id: 'nus', name: 'NUS', location: 'Singapore', ranking: '#8 World', tuition: 'SGD 30,000/yr', tags: ['Asia Top', 'Tech'], icon: '🦁', desc: 'The National University of Singapore is a leading global university centred in Asia.' },
  { id: 'mit', name: 'MIT', location: 'USA, Cambridge', ranking: '#1 World', tuition: '$57,000/yr', tags: ['Tech', 'Engineering'], icon: '🤖', desc: 'A global leader in engineering, science, and technology education.' },
];

const PROCESS_STEPS = [
  { title: "1. 咨询评估", desc: "专业顾问1对1评估，制定留学方案" },
  { title: "2. 选校定校", desc: "基于排名、专业、预算筛选最适合的学校" },
  { title: "3. 文书准备", desc: "打造个性化PS/CV，挖掘申请亮点" },
  { title: "4. 递交申请", desc: "全程跟踪申请进度，及时补件" },
  { title: "5. 签证住宿", desc: "模拟面签培训，协助安排海外住宿" },
];

const PACKAGES = [
  { title: "菁英名校保录", price: "¥58,000起", features: ["Top 30名校规划", "外籍导师文书润色", "背景提升项目"] },
  { title: "全球联申计划", price: "¥36,000起", features: ["多国混申策略", "不限申请数量", "签证全程服务"] },
  { title: "DIY指导服务", price: "¥12,000起", features: ["文书精修", "网申填写指导", "选校建议报告"] },
];

const NEWS_DATA = [
    { title: "2025年USNews世界大学排名发布", date: "2024-09-15", desc: "哈佛大学继续蝉联榜首，中国高校排名稳步上升，查看完整榜单及分析..." },
    { title: "英国PSW签证政策更新解读", date: "2024-09-10", desc: "英国内政部发布最新毕业生签证细则，留学生毕业后留英工作机会增加..." },
    { title: "澳洲八大录取要求调整通知", date: "2024-09-01", desc: "墨尔本大学、悉尼大学提高部分商科专业雅思及GPA门槛，申请者需注意..." },
    { title: "2024秋季入学行前指南", date: "2024-08-20", desc: "行李清单、入境流程、租房攻略，一文搞定你的出国准备..." }
];

// --- Styles ---
const styles = {
  overlay: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none' as 'none',
    display: 'flex',
    flexDirection: 'column' as 'column',
    justifyContent: 'space-between',
    boxSizing: 'border-box' as 'border-box',
    overflow: 'hidden',
  },
  nav: (visible: boolean) => ({
    pointerEvents: visible ? 'auto' : 'none' as 'auto' | 'none',
    zIndex: 50,
    padding: '1.5rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0) 100%)',
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.5s ease',
  }),
  logo: {
    fontSize: '1.8rem',
    fontWeight: 700,
    background: 'linear-gradient(to right, #fca5a5, #f87171)', // Red-ish gradient
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.05em',
    cursor: 'pointer',
  },
  navLinks: {
    display: 'flex',
    gap: '2rem',
  },
  navLink: (isActive: boolean) => ({
    color: isActive ? '#f87171' : '#cbd5e1',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'color 0.3s',
    position: 'relative' as 'relative',
  }),
  // Holographic Menu Styles
  holoContainer: {
    position: 'absolute' as 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'auto' as 'auto',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column' as 'column',
    alignItems: 'flex-start',
    transformOrigin: 'bottom left',
    transition: 'opacity 0.3s ease, transform 0.1s linear',
  },
  holoLine: {
    width: '2px',
    height: '40px',
    background: 'linear-gradient(to top, rgba(248, 113, 113, 0.8), transparent)',
    marginLeft: '10px',
    boxShadow: '0 0 8px #f87171',
  },
  holoMenuBox: (isVisible: boolean) => ({
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(248, 113, 113, 0.4)',
    borderRadius: '16px',
    borderBottomLeftRadius: '4px',
    padding: '1.5rem',
    boxShadow: '0 0 30px rgba(248, 113, 113, 0.2), inset 0 0 20px rgba(248, 113, 113, 0.1)',
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '0.5rem',
    transform: isVisible ? 'scale(1) translate(20px, -10px)' : 'scale(0) translate(0, 0)',
    opacity: isVisible ? 1 : 0,
    transformOrigin: 'bottom left',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  }),
  holoTitle: {
    color: '#fca5a5',
    fontSize: '0.75rem',
    textTransform: 'uppercase' as 'uppercase',
    letterSpacing: '0.2em',
    marginBottom: '0.2rem',
    borderBottom: '1px solid rgba(248, 113, 113, 0.3)',
    paddingBottom: '0.5rem',
    display: 'flex',
    justifyContent: 'space-between',
  },
  holoButton: {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.0) 100%)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'white',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left' as 'left',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  // Content Panel Styles
  contentPanel: (isVisible: boolean) => ({
    position: 'absolute' as 'absolute',
    top: '50%',
    right: '5%',
    transform: `translateY(-50%) translateX(${isVisible ? '0' : '50px'})`,
    width: '60%', // Wider for comparison
    maxHeight: '85%',
    overflowY: 'auto' as 'auto',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '2.5rem',
    opacity: isVisible ? 1 : 0,
    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: isVisible ? 'auto' : 'none' as 'auto' | 'none',
    zIndex: 10,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.2rem',
    marginTop: '1.5rem',
  },
  schoolCard: (selected: boolean) => ({
    background: selected ? 'rgba(248, 113, 113, 0.1)' : 'rgba(255, 255, 255, 0.03)',
    borderRadius: '16px',
    padding: '1.5rem',
    border: selected ? '1px solid #f87171' : '1px solid rgba(255, 255, 255, 0.05)',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '0.5rem',
    position: 'relative' as 'relative',
  }),
  tag: {
    fontSize: '0.75rem',
    background: 'rgba(255,255,255,0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: '#cbd5e1',
  },
  btnPrimary: {
    background: '#f87171',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    marginTop: 'auto',
  },
  btnOutline: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.2)',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  // Chat Styles
  chatContainer: (isOpen: boolean) => ({
    position: 'absolute' as 'absolute',
    bottom: '2rem',
    right: '2rem',
    width: '380px',
    height: '500px',
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    overflow: 'hidden',
    pointerEvents: isOpen ? 'auto' : 'none' as 'auto' | 'none',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.9)',
    opacity: isOpen ? 1 : 0,
    zIndex: 40,
  }),
  // Comparison Bar
  compareBar: (count: number) => ({
    position: 'absolute' as 'absolute',
    bottom: '2rem',
    left: '50%',
    transform: `translateX(-50%) translateY(${count > 0 ? '0' : '150%'})`,
    background: '#1e293b',
    padding: '1rem 2rem',
    borderRadius: '50px',
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    border: '1px solid rgba(255,255,255,0.1)',
    transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    pointerEvents: 'auto' as 'auto',
    zIndex: 50,
  })
};

// --- Three.js Component ---
const ThreeScene: React.FC<{ 
  onInteraction: (type: InteractionType, message?: string) => void; 
  isChatOpen: boolean; 
  currentView: PageView;
  holoMenuRef: React.RefObject<HTMLDivElement | null>;
}> = ({ onInteraction, isChatOpen, currentView, holoMenuRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePosition = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const targetRotationY = useRef(0);
  
  const sceneGroupRef = useRef<THREE.Group | null>(null);
  const pivotGroupRef = useRef<THREE.Group | null>(null);
  const robotRef = useRef<THREE.Group | null>(null);
  const headRef = useRef<THREE.Group | null>(null);
  const leftArmRef = useRef<THREE.Group | null>(null);
  const rightArmRef = useRef<THREE.Group | null>(null);
  const leftLegRef = useRef<THREE.Group | null>(null);
  const rightLegRef = useRef<THREE.Group | null>(null);
  const emitterRef = useRef<THREE.Group | null>(null);

  const animationState = useRef<{ type: string, startTime: number }>({ type: 'idle', startTime: 0 });

  // Procedural Texture for Peanut
  const createPeanutTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if(ctx) {
          ctx.fillStyle = '#E5C687';
          ctx.fillRect(0, 0, 256, 256);
          for(let i=0; i<5000; i++) {
              const x = Math.random() * 256;
              const y = Math.random() * 256;
              const size = Math.random() * 2 + 1;
              ctx.fillStyle = `rgba(160, 120, 60, ${Math.random() * 0.1 + 0.05})`;
              ctx.beginPath();
              ctx.arc(x, y, size, 0, Math.PI*2);
              ctx.fill();
          }
      }
      return new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    scene.fog = new THREE.FogExp2('#0f172a', 0.03);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffdddd, 10);
    spotLight.position.set(5, 8, 6);
    spotLight.castShadow = true;
    scene.add(spotLight);

    const fillLight = new THREE.PointLight(0xfca5a5, 3);
    fillLight.position.set(-5, 2, -2);
    scene.add(fillLight);

    // --- ROBOT ---
    const sceneGroup = new THREE.Group();
    scene.add(sceneGroup);
    sceneGroupRef.current = sceneGroup;

    const pivotGroup = new THREE.Group();
    sceneGroup.add(pivotGroup);
    pivotGroupRef.current = pivotGroup;

    const robotGroup = new THREE.Group();
    pivotGroup.add(robotGroup);
    robotRef.current = robotGroup;
    
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.3, clearcoat: 0.8 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 }); // Red accent for new theme
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    
    // 1. Head
    const headGroup = new THREE.Group();
    headGroup.name = 'head';
    const headGeo = new THREE.SphereGeometry(0.65, 32, 32);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headMesh.userData = { part: 'head' };
    
    // Eyes & Mouth
    const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, darkMat);
    leftEye.position.set(-0.22, 0.1, 0.58);
    const rightEye = new THREE.Mesh(eyeGeo, darkMat);
    rightEye.position.set(0.22, 0.1, 0.58);

    const smileGeo = new THREE.TorusGeometry(0.15, 0.02, 8, 16, Math.PI);
    const smile = new THREE.Mesh(smileGeo, darkMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.1, 0.6);

    const cheekGeo = new THREE.CircleGeometry(0.08, 16);
    const cheekMat = new THREE.MeshBasicMaterial({color: 0xfca5a5, transparent: true, opacity: 0.6});
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
    leftCheek.position.set(-0.35, -0.05, 0.55);
    leftCheek.rotation.y = -0.4;
    const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
    rightCheek.position.set(0.35, -0.05, 0.55);
    rightCheek.rotation.y = 0.4;

    // --- PEANUT ON HEAD ---
    const peanutGroup = new THREE.Group();
    const peanutTex = createPeanutTexture();
    const peanutMat = new THREE.MeshStandardMaterial({ 
        color: 0xE5C687, // Peanut shell color
        roughness: 1.0,
        bumpMap: peanutTex,
        bumpScale: 0.05,
    });
    
    // Create a distinct "figure-8" peanut shape
    const pBottomGeo = new THREE.SphereGeometry(0.1, 32, 32); // Higher poly for texture
    const pBottom = new THREE.Mesh(pBottomGeo, peanutMat);
    pBottom.scale.set(1, 1.2, 1);
    
    const pTopGeo = new THREE.SphereGeometry(0.08, 32, 32);
    const pTop = new THREE.Mesh(pTopGeo, peanutMat);
    pTop.scale.set(1, 1.15, 1);
    pTop.position.y = 0.15;
    pTop.position.x = 0.02; // slight slight angle
    pTop.rotation.z = -0.1;

    peanutGroup.add(pBottom, pTop);
    
    // Position on top of head
    peanutGroup.position.set(0, 0.62, 0); 
    peanutGroup.rotation.z = 0.15; 
    peanutGroup.rotation.y = 0.1;

    headGroup.add(headMesh, leftEye, rightEye, smile, leftCheek, rightCheek, peanutGroup);
    headGroup.position.y = 1.1;
    headRef.current = headGroup;
    robotGroup.add(headGroup);

    // 2. Torso
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'body';
    const torsoGeo = new THREE.SphereGeometry(0.6, 32, 32);
    torsoGeo.scale(1, 1.1, 0.9);
    const torso = new THREE.Mesh(torsoGeo, bodyMat);
    torso.userData = { part: 'body' };
    
    const shirtGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.4, 32, 1, true);
    const shirt = new THREE.Mesh(shirtGeo, accentMat);
    shirt.position.y = 0.1;

    // TaoLi Logo - Fixed visibility
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = 256;
    logoCanvas.height = 128;
    const ctx = logoCanvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, 256, 128);
        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        ctx.shadowBlur = 4;
        ctx.fillText('TaoLi', 128, 64);
    }
    const logoTex = new THREE.CanvasTexture(logoCanvas);
    logoTex.colorSpace = THREE.SRGBColorSpace;
    
    const logoPlaneGeo = new THREE.PlaneGeometry(0.5, 0.25);
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, side: THREE.DoubleSide });
    const logoMesh = new THREE.Mesh(logoPlaneGeo, logoMat);
    logoMesh.position.set(0, 0.1, 0.63); // Z pushed out to prevent clipping
    
    torsoGroup.add(torso, shirt, logoMesh);
    torsoGroup.position.y = 0.0;
    robotGroup.add(torsoGroup);

    // 3. Limbs
    const createLimb = (isLeft: boolean, isArm: boolean) => {
        const group = new THREE.Group();
        const side = isLeft ? -1 : 1;
        
        if (isArm) {
            const armGeo = new THREE.CapsuleGeometry(0.13, 0.5, 4, 8);
            const arm = new THREE.Mesh(armGeo, bodyMat);
            arm.position.set(side * 0.05, -0.3, 0);
            group.add(arm);

            const handGeo = new THREE.SphereGeometry(0.16, 16, 16);
            const hand = new THREE.Mesh(handGeo, bodyMat);
            hand.position.set(side * 0.05, -0.65, 0);
            hand.userData = { part: isLeft ? 'leftHand' : 'rightHand' };
            group.add(hand);

            // Holographic Emitter in Right Hand
            if (!isLeft) {
                const emitterGroup = new THREE.Group();
                const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 16), darkMat);
                const beamGeo = new THREE.CylinderGeometry(0.3, 0.05, 0.6, 16, 1, true);
                const beamMat = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.1, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
                const beam = new THREE.Mesh(beamGeo, beamMat);
                beam.position.y = 0.35;

                emitterGroup.add(puck, beam);
                emitterGroup.position.set(side * 0.05, -0.65, 0.16);
                emitterGroup.rotation.x = -Math.PI / 2;
                group.add(emitterGroup);
                emitterRef.current = emitterGroup;
            }
            group.position.set(side * 0.55, 0.4, 0);
        } else {
            const legGeo = new THREE.CapsuleGeometry(0.14, 0.4, 4, 8);
            const leg = new THREE.Mesh(legGeo, bodyMat);
            leg.position.set(0, -0.2, 0);
            group.add(leg);

            const footGeo = new THREE.CapsuleGeometry(0.15, 0.2, 4, 8);
            const foot = new THREE.Mesh(footGeo, bodyMat);
            foot.rotation.x = Math.PI / 2;
            foot.position.set(0, -0.5, 0.1);
            foot.userData = { part: isLeft ? 'leftFoot' : 'rightFoot' };
            group.add(foot);
            group.position.set(side * 0.25, -0.6, 0);
        }
        return group;
    };

    const leftArm = createLimb(true, true);
    leftArmRef.current = leftArm;
    robotGroup.add(leftArm);
    const rightArm = createLimb(false, true);
    rightArmRef.current = rightArm;
    robotGroup.add(rightArm);
    const leftLeg = createLimb(true, false);
    leftLegRef.current = leftLeg;
    robotGroup.add(leftLeg);
    const rightLeg = createLimb(false, false);
    rightLegRef.current = rightLeg;
    robotGroup.add(rightLeg);

    // Interaction Logic
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseMove = (event: MouseEvent) => {
        mousePosition.current = {
            x: (event.clientX / window.innerWidth) * 2 - 1,
            y: -(event.clientY / window.innerHeight) * 2 + 1
        };
        
        if (isDragging.current) {
            const deltaX = event.clientX - lastMouseX.current;
            targetRotationY.current += deltaX * 0.005;
            lastMouseX.current = event.clientX;
        } else {
            mouse.x = mousePosition.current.x;
            mouse.y = mousePosition.current.y;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(robotGroup.children, true);
            document.body.style.cursor = intersects.length > 0 ? 'grab' : 'default';
        }
    };

    const onMouseDown = (event: MouseEvent) => {
        isDragging.current = true;
        lastMouseX.current = event.clientX;
        document.body.style.cursor = 'grabbing';
    };

    const onMouseUp = (event: MouseEvent) => {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(robotGroup.children, true);
        if (intersects.length > 0) {
            const part = intersects[0].object.userData.part;
            if (part) onInteraction('wave', `You touched my ${part}!`);
        }
    };

    const dom = containerRef.current;
    dom.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('mouseleave', () => isDragging.current = false);
    
    const animate = () => {
        requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        
        if (robotRef.current) robotRef.current.position.y = Math.sin(time) * 0.1;
        
        // View-based positioning
        const targetX = currentView === 'home' ? (isChatOpen ? -2.0 : 0) : -2.8;
        if (sceneGroupRef.current) {
            sceneGroupRef.current.position.x = THREE.MathUtils.lerp(sceneGroupRef.current.position.x, targetX, 0.08);
        }
        
        if (pivotGroupRef.current) {
            pivotGroupRef.current.rotation.y = THREE.MathUtils.lerp(pivotGroupRef.current.rotation.y, targetRotationY.current, 0.1);
        }

        if (headRef.current) {
            headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, mousePosition.current.x * 0.5, 0.1);
            headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, mousePosition.current.y * 0.5, 0.1);
        }

        // Menu Arm Pose
        if (rightArmRef.current) {
            const targetRotZ = currentView === 'home' ? 1.8 : 0.1 + Math.sin(time * 1.5) * 0.05;
            const targetRotX = currentView === 'home' ? 0.8 : 0;
            rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, targetRotZ, 0.1);
            rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, targetRotX, 0.1);
        }

        // Holo Menu Tracking
        if (emitterRef.current && holoMenuRef.current) {
            const v = new THREE.Vector3();
            emitterRef.current.getWorldPosition(v);
            v.y += 0.5; v.x += 0.1;
            v.project(camera);
            const x = (v.x * .5 + .5) * window.innerWidth;
            const y = (-(v.y * .5) + .5) * window.innerHeight;
            
            if (Math.abs(v.z) < 1) {
                holoMenuRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            }
        }

        renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
        if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
    };
  }, [isChatOpen, currentView]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
};

// --- Components ---
const SchoolCard: React.FC<{ 
  school: School; 
  selected: boolean; 
  onSelect: () => void; 
  onDetail: () => void;
}> = ({ school, selected, onSelect, onDetail }) => (
    <div style={styles.schoolCard(selected)} onClick={onDetail} className="fade-in">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'start'}}>
            <span style={{fontSize:'2.5rem'}}>{school.icon}</span>
            <input 
                type="checkbox" 
                checked={selected} 
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                style={{width:'20px', height:'20px', cursor:'pointer', accentColor:'#f87171'}}
            />
        </div>
        <div style={{color:'#e2e8f0', fontWeight:'bold', fontSize:'1.1rem'}}>{school.name}</div>
        <div style={{color:'#94a3b8', fontSize:'0.9rem'}}>{school.location}</div>
        <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
            {school.tags.map(tag => <span key={tag} style={styles.tag}>{tag}</span>)}
        </div>
        <div style={{color:'#f87171', fontWeight:600}}>{school.ranking}</div>
        <button style={styles.btnPrimary} onClick={(e) => { e.stopPropagation(); onDetail(); }}>查看详情</button>
    </div>
);

// --- Main App ---
const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<PageView>('home');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm TaoLi. 👋 Ready to explore your dream school?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  
  // School Features State
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [viewSchool, setViewSchool] = useState<School | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const holoMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages]);

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || inputValue.trim();
    if (!userMsg || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsLoading(true);
    if (!chatOpen) setChatOpen(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
            ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
            { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "Let me verify that info..." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSchoolSelect = (id: string) => {
      setSelectedSchools(prev => {
          if (prev.includes(id)) return prev.filter(sid => sid !== id);
          if (prev.length >= 3) {
              setToastMsg("最多对比3所学校");
              setTimeout(() => setToastMsg(null), 3000);
              return prev;
          }
          return [...prev, id];
      });
  };

  const getComparisonSchools = () => SCHOOLS_DATA.filter(s => selectedSchools.includes(s.id));

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0f172a' }}>
      <ThreeScene 
        onInteraction={(t, m) => { if (t === 'chat') setChatOpen(p => !p); }} 
        isChatOpen={chatOpen} 
        currentView={currentView} 
        holoMenuRef={holoMenuRef}
      />

      <div style={styles.overlay}>
        {/* Holo Menu - Updated to Chinese */}
        <div ref={holoMenuRef} style={styles.holoContainer}>
           <div style={{...styles.holoLine, opacity: currentView === 'home' ? 1 : 0}}></div>
           <div style={styles.holoMenuBox(currentView === 'home')}>
              <div style={styles.holoTitle}><span>Quick Menu</span></div>
              <div style={styles.holoButton} onClick={() => setCurrentView('home')}><span>🏠</span> 首页</div>
              <div style={styles.holoButton} onClick={() => setCurrentView('schools')}><span>🏫</span> 学校查询</div>
              <div style={styles.holoButton} onClick={() => setCurrentView('process')}><span>📝</span> 服务流程</div>
              <div style={styles.holoButton} onClick={() => setCurrentView('packages')}><span>📦</span> 留学套餐</div>
              <div style={styles.holoButton} onClick={() => setCurrentView('news')}><span>📰</span> 资讯中心</div>
              <div style={styles.holoButton} onClick={() => setCurrentView('about')}><span>ℹ️</span> 关于我们</div>
           </div>
        </div>

        {/* Top Nav - Updated to Chinese */}
        <nav style={styles.nav(currentView !== 'home')}>
          <div style={styles.logo} onClick={() => setCurrentView('home')}>TaoLi Edu</div>
          <div style={styles.navLinks}>
            <a style={styles.navLink(currentView === 'home')} onClick={() => setCurrentView('home')}>首页</a>
            <a style={styles.navLink(currentView === 'schools')} onClick={() => setCurrentView('schools')}>学校查询</a>
            <a style={styles.navLink(currentView === 'process')} onClick={() => setCurrentView('process')}>服务流程</a>
            <a style={styles.navLink(currentView === 'packages')} onClick={() => setCurrentView('packages')}>留学套餐</a>
            <a style={styles.navLink(currentView === 'news')} onClick={() => setCurrentView('news')}>资讯中心</a>
            <a style={styles.navLink(currentView === 'about')} onClick={() => setCurrentView('about')}>关于我们</a>
          </div>
        </nav>

        {toastMsg && <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            background: '#f87171', padding: '10px 20px', borderRadius: '20px', color:'white',
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)', zIndex: 200
        }}>{toastMsg}</div>}

        {/* SCHOOL SEARCH */}
        <div style={styles.contentPanel(currentView === 'schools')}>
            <h2 style={{fontSize:'2rem', fontWeight:700, color:'white', marginBottom:'0.5rem'}}>全球院校查询</h2>
            <p style={{color:'#94a3b8'}}>选择院校进行对比，或点击查看详情。</p>
            <div style={styles.grid}>
                {SCHOOLS_DATA.map(school => (
                    <SchoolCard 
                        key={school.id} 
                        school={school} 
                        selected={selectedSchools.includes(school.id)}
                        onSelect={() => toggleSchoolSelect(school.id)}
                        onDetail={() => setViewSchool(school)}
                    />
                ))}
            </div>
        </div>

        {/* OTHER PAGES */}
        <div style={styles.contentPanel(currentView === 'process')}>
            <h2 style={{fontSize:'2rem', color:'white'}}>全流程服务</h2>
            <div style={{marginTop:'2rem', display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                {PROCESS_STEPS.map((step, i) => (
                    <div key={i} className="fade-in" style={{animationDelay:`${i*0.1}s`, background:'rgba(255,255,255,0.05)', padding:'1.5rem', borderRadius:'12px'}}>
                        <div style={{color:'#fca5a5', fontSize:'1.2rem', fontWeight:'bold'}}>{step.title}</div>
                        <div style={{color:'#cbd5e1'}}>{step.desc}</div>
                    </div>
                ))}
            </div>
        </div>

        <div style={styles.contentPanel(currentView === 'packages')}>
             <h2 style={{fontSize:'2rem', color:'white'}}>尊享留学套餐</h2>
             <div style={styles.grid}>
                 {PACKAGES.map((pkg, i) => (
                     <div key={i} className="fade-in" style={{animationDelay:`${i*0.1}s`, background:'rgba(255,255,255,0.05)', padding:'2rem', borderRadius:'16px', textAlign:'center', border:'1px solid rgba(255,255,255,0.1)'}}>
                         <h3 style={{fontSize:'1.5rem', color:'white'}}>{pkg.title}</h3>
                         <div style={{fontSize:'2rem', color:'#f87171', margin:'1rem 0'}}>{pkg.price}</div>
                         <ul style={{listStyle:'none', padding:0, textAlign:'left', color:'#94a3b8', lineHeight:'2'}}>
                             {pkg.features.map(f => <li key={f}>✓ {f}</li>)}
                         </ul>
                         <button style={{...styles.btnPrimary, width:'100%', marginTop:'1rem'}}>咨询详情</button>
                     </div>
                 ))}
             </div>
        </div>

        {/* NEWS PAGE */}
        <div style={styles.contentPanel(currentView === 'news')}>
            <h2 style={{fontSize:'2rem', color:'white', marginBottom:'2rem'}}>留学资讯中心</h2>
            <div style={{display:'flex', flexDirection:'column', gap:'1.5rem'}}>
                {NEWS_DATA.map((news, i) => (
                    <div key={i} className="fade-in" style={{animationDelay:`${i*0.1}s`, background:'rgba(255,255,255,0.03)', padding:'1.5rem', borderRadius:'12px', borderLeft:'4px solid #f87171', cursor:'pointer', transition:'background 0.2s'}}
                         onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                         onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'0.5rem'}}>
                            <h3 style={{color:'white', margin:0, fontSize:'1.2rem'}}>{news.title}</h3>
                            <span style={{color:'#94a3b8', fontSize:'0.9rem'}}>{news.date}</span>
                        </div>
                        <p style={{color:'#cbd5e1', margin:0}}>{news.desc}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* ABOUT PAGE */}
        <div style={styles.contentPanel(currentView === 'about')}>
            <h2 style={{fontSize:'2rem', color:'white', marginBottom:'2rem'}}>关于 TaoLi Edu</h2>
            <div style={{color:'#cbd5e1', lineHeight:'1.8', fontSize:'1.1rem'}} className="fade-in">
                <p style={{marginBottom:'1.5rem'}}>
                    TaoLi Edu (桃李教育) 致力于为中国学生提供最专业的全球留学规划服务。"桃李不言，下自成蹊"，我们相信优质的教育规划能让学生自然绽放光彩。
                </p>
                <p style={{marginBottom:'1.5rem'}}>
                    我们拥有由常青藤名校校友组成的顾问团队，结合独家AI大数据系统，为您提供精准的选校定位和极具竞争力的文书指导。
                </p>
                <div style={{display:'flex', gap:'2rem', marginTop:'3rem'}}>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'2rem', color:'#f87171', fontWeight:'bold'}}>10+</div>
                        <div style={{fontSize:'0.9rem'}}>年行业经验</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'2rem', color:'#f87171', fontWeight:'bold'}}>5000+</div>
                        <div style={{fontSize:'0.9rem'}}>成功案例</div>
                    </div>
                    <div style={{textAlign:'center'}}>
                        <div style={{fontSize:'2rem', color:'#f87171', fontWeight:'bold'}}>98%</div>
                        <div style={{fontSize:'0.9rem'}}>名校录取率</div>
                    </div>
                </div>
                
                <h3 style={{marginTop:'3rem', color:'white'}}>联系我们</h3>
                <p>📍 北京市海淀区中关村大街1号</p>
                <p>📞 400-888-6666</p>
                <p>📧 contact@taoli-edu.com</p>
            </div>
        </div>

        {/* COMPARISON BAR */}
        <div style={styles.compareBar(selectedSchools.length)}>
            <div style={{color:'white'}}>已选 {selectedSchools.length}/3 所学校</div>
            <button style={styles.btnPrimary} onClick={() => setCompareMode(true)}>开始对比</button>
            <button style={styles.btnOutline} onClick={() => setSelectedSchools([])}>清空</button>
        </div>

        {/* MODALS */}
        {/* School Detail Modal */}
        {viewSchool && (
            <div style={{
                position: 'absolute', inset:0, background:'rgba(0,0,0,0.8)', backdropFilter:'blur(10px)', 
                display:'flex', justifyContent:'center', alignItems:'center', zIndex:200,
                pointerEvents: 'auto'
            }} onClick={() => setViewSchool(null)}>
                <div className="fade-in" style={{
                    background:'#1e293b', width:'500px', padding:'2rem', borderRadius:'24px', border:'1px solid #334155',
                    position:'relative', boxShadow:'0 20px 50px rgba(0,0,0,0.5)'
                }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setViewSchool(null)} style={{position:'absolute', top:'1rem', right:'1rem', background:'none', border:'none', color:'#94a3b8', fontSize:'1.5rem', cursor:'pointer'}}>✕</button>
                    <div style={{fontSize:'4rem', textAlign:'center'}}>{viewSchool.icon}</div>
                    <h2 style={{color:'white', textAlign:'center', margin:'1rem 0'}}>{viewSchool.name}</h2>
                    <p style={{color:'#94a3b8', textAlign:'center', marginBottom:'2rem'}}>{viewSchool.desc}</p>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginBottom:'2rem'}}>
                         <div style={{background:'rgba(255,255,255,0.05)', padding:'1rem', borderRadius:'8px', textAlign:'center'}}>
                             <div style={{color:'#f87171', fontWeight:'bold'}}>Ranking</div>
                             <div style={{color:'white'}}>{viewSchool.ranking}</div>
                         </div>
                         <div style={{background:'rgba(255,255,255,0.05)', padding:'1rem', borderRadius:'8px', textAlign:'center'}}>
                             <div style={{color:'#f87171', fontWeight:'bold'}}>Tuition</div>
                             <div style={{color:'white'}}>{viewSchool.tuition}</div>
                         </div>
                    </div>
                    <button 
                        style={{...styles.btnPrimary, width:'100%', padding:'1rem'}} 
                        onClick={() => {
                            setChatOpen(true);
                            setViewSchool(null);
                            handleSend(`Tell me more about ${viewSchool.name} in ${viewSchool.location}`);
                        }}
                    >
                        Ask Horizon AI about this school
                    </button>
                </div>
            </div>
        )}

        {/* Comparison Modal - FIXED CLOSE BUTTON */}
        {compareMode && (
            <div style={{
                position: 'absolute', inset:0, background:'rgba(15, 23, 42, 0.98)', zIndex:200, padding:'5%',
                pointerEvents: 'auto', 
                display: 'flex', flexDirection: 'column',
                overflow: 'auto'
            }}>
                <div className="fade-in" style={{display:'flex', justifyContent:'space-between', marginBottom:'2rem', alignItems:'center', position:'relative'}}>
                    <h2 style={{color:'white', fontSize:'2rem', margin:0}}>院校对比</h2>
                    {/* Big explicit close button top right */}
                    <button 
                        style={{
                            background:'rgba(255,255,255,0.1)', border:'none', color:'white', width:'40px', height:'40px', 
                            borderRadius:'50%', fontSize:'1.5rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'
                        }} 
                        onClick={() => setCompareMode(false)}
                    >
                        ✕
                    </button>
                </div>
                <div className="fade-in" style={{display:'grid', gridTemplateColumns:`repeat(${Math.max(1, selectedSchools.length)}, 1fr)`, gap:'2rem', flex:1}}>
                    {getComparisonSchools().map(s => (
                        <div key={s.id} style={{background:'#1e293b', padding:'2rem', borderRadius:'16px', borderTop:'4px solid #f87171', display:'flex', flexDirection:'column', boxShadow:'0 10px 30px rgba(0,0,0,0.3)'}}>
                            <div style={{fontSize:'3rem', textAlign:'center'}}>{s.icon}</div>
                            <h3 style={{color:'white', textAlign:'center'}}>{s.name}</h3>
                            <div style={{marginTop:'2rem', display:'flex', flexDirection:'column', gap:'1rem', flex:1}}>
                                <div style={{borderBottom:'1px solid #334155', paddingBottom:'0.5rem'}}>
                                    <span style={{color:'#94a3b8', fontSize:'0.8rem'}}>Location</span><br/>
                                    <span style={{color:'white'}}>{s.location}</span>
                                </div>
                                <div style={{borderBottom:'1px solid #334155', paddingBottom:'0.5rem'}}>
                                    <span style={{color:'#94a3b8', fontSize:'0.8rem'}}>Ranking</span><br/>
                                    <span style={{color:'#f87171', fontWeight:'bold'}}>{s.ranking}</span>
                                </div>
                                <div style={{borderBottom:'1px solid #334155', paddingBottom:'0.5rem'}}>
                                    <span style={{color:'#94a3b8', fontSize:'0.8rem'}}>Tuition</span><br/>
                                    <span style={{color:'white'}}>{s.tuition}</span>
                                </div>
                                <div style={{borderBottom:'1px solid #334155', paddingBottom:'0.5rem'}}>
                                    <span style={{color:'#94a3b8', fontSize:'0.8rem'}}>Highlights</span><br/>
                                    <div style={{display:'flex', gap:'5px', flexWrap:'wrap', marginTop:'5px'}}>
                                        {s.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Chat Window */}
        <div style={{...styles.chatContainer(chatOpen)}}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)' }}>
            <span style={{fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <span style={{width:'8px', height:'8px', background:'#4ade80', borderRadius:'50%'}}></span>
                TaoLi AI
            </span>
            <button onClick={() => setChatOpen(false)} style={{background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer'}}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                  maxWidth: '85%', padding: '12px 16px', borderRadius: '16px', fontSize: '0.95rem', lineHeight: '1.5',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  background: msg.role === 'user' ? '#f87171' : 'rgba(255,255,255,0.08)',
                  color: 'white',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                  borderBottomLeftRadius: msg.role === 'user' ? '16px' : '4px',
              }}>
                {msg.text}
              </div>
            ))}
            {isLoading && <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>TaoLi is thinking...</div>}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '0.8rem' }}>
            <input 
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'white', outline: 'none' }}
              value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask anything..."
            />
            <button style={{ ...styles.btnPrimary, width: '48px', display:'flex', justifyContent:'center', alignItems:'center', marginTop:0 }} onClick={() => handleSend()}>➤</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
