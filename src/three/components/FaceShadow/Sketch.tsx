import {
  Environment,
  OrbitControls,
  Sky,
  useGLTF,
  useTexture,
} from "@react-three/drei";
import { useInteractStore, useLoadedStore } from "@utils/Store";
import { flatModel, printModel } from "@utils/misc";
import { useEffect, useMemo, useRef } from "react";
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MirroredRepeatWrapping,
  RepeatWrapping,
  Uniform,
  Vector3,
} from "three";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import vertexShader from "../shader/vertex.glsl";
import fragmentShader from "../shader/fragment.glsl";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { EffectComposer, SMAA } from "@react-three/postprocessing";
import { color } from "three/examples/jsm/nodes/Nodes.js";

const Sketch = () => {
  const gltf = useGLTF("/face.glb");
  const ayakaGltf = useGLTF("/ayaka.glb");
  const faceLightMap = useTexture("/faceLightmap.png");
  faceLightMap.wrapS = faceLightMap.wrapT = RepeatWrapping;
  faceLightMap.generateMipmaps = false;
  faceLightMap.flipY = false;
  const groupRef = useRef<Group>(null);
  const controlDom = useInteractStore((state) => state.controlDom);

  const uniforms = useMemo(
    () => ({
      uLightPosition: new Uniform(new Vector3()),
      uFaceLightMap: new Uniform(faceLightMap),
    }),
    []
  );

  useControls("Light", {
    rotation: {
      value: 0,
      min: 0,
      max: Math.PI * 2,
      step: Math.PI / 100,
      onChange: (v) => {
        groupRef.current!.rotation.y = v;
      },
    },
  });

  useEffect(() => {
    const modelParts = flatModel(gltf);
    printModel(modelParts);
    // const face = modelParts[1];
    // console.log("face", face);

    // face.material = newMat;
    ayakaGltf.scene.traverse((child) => {
      if (child instanceof Mesh) {
        const mat = child.material as MeshStandardMaterial;
        if (mat.name === "face") {
          const newMat = new CustomShaderMaterial({
            baseMaterial: MeshBasicMaterial,
            vertexShader,
            fragmentShader,
            uniforms,
            map: mat.map,
            silent: true,
            // side: DoubleSide,
          });
          child.material = newMat;
        } else {
          child.material = new CustomShaderMaterial({
            baseMaterial: MeshBasicMaterial,
            map: mat.map,
            color: mat.color,
            transparent: true,
            uniforms,
            vertexShader,
            silent: true,
            fragmentShader: /* glsl */ `
              uniform vec3 uLightPosition;
              varying vec3 vWorldNormal;

            void main() {
              vec3 nomal = normalize(vWorldNormal);
              float NDotV = dot(nomal, uLightPosition);
              float factor =  step(0.0, NDotV);
              vec3 baseColor = csm_DiffuseColor.rgb;
              vec3 darkColor = baseColor * 0.8;
              // csm_DiffuseColor = vec4(mix(darkColor, baseColor, factor), 1.0);
              csm_DiffuseColor = vec4(mix(darkColor, baseColor, factor), csm_DiffuseColor.a);
            }
            `,
          });
        }
      }
    });

    useLoadedStore.setState({ ready: true });
  }, []);

  useFrame((state, delta) => {
    const vec = new Vector3();
    groupRef.current?.children[0].getWorldPosition(vec);
    uniforms.uLightPosition.value = vec;
    // groupRef.current!.rotation.y += delta;
  });

  return (
    <>
      <OrbitControls domElement={controlDom} />
      <color attach={"background"} args={["ivory"]} />
      {/* <primitive object={gltf.scene} scale={[2, 2, 2]} /> */}
      <primitive object={ayakaGltf.scene} />
      <group ref={groupRef} visible={false}>
        <mesh position={[0, 0, 1]} scale={[0.2, 0.2, 0.2]}>
          <sphereGeometry></sphereGeometry>
          <meshBasicMaterial color={"hotpink"}></meshBasicMaterial>
        </mesh>
      </group>
      <EffectComposer disableNormalPass multisampling={8}>
        <SMAA />
      </EffectComposer>
    </>
  );
};

export default Sketch;
