import bpy
import bmesh
from mathutils import Vector
import random

class ParticleGrassGenerator:
    def __init__(self, mesh_obj, particle_count=10000, grass_length=0.15, clump_children=5):
        self.mesh_obj = mesh_obj
        self.particle_count = particle_count
        self.grass_length = grass_length
        self.clump_children = clump_children
        
    def fix_normals(self):
        """Check and fix mesh normals to point outward"""
        print("Checking and fixing normals...")
        
        # Enter edit mode
        bpy.context.view_layer.objects.active = self.mesh_obj
        bpy.ops.object.mode_set(mode='EDIT')
        
        # Select all faces
        bpy.ops.mesh.select_all(action='SELECT')
        
        # Recalculate normals to point outside
        bpy.ops.mesh.normals_make_consistent(inside=False)
        
        # Exit edit mode
        bpy.ops.object.mode_set(mode='OBJECT')
        
        print("Normals fixed to point outward")
    
    def create_grass_particle_system(self):
        """Create hair particle system on the mesh"""
        print("Creating hair particle system...")
        
        # Fix normals first
        self.fix_normals()
        
        # Select and activate the mesh
        bpy.context.view_layer.objects.active = self.mesh_obj
        bpy.ops.object.select_all(action='DESELECT')
        self.mesh_obj.select_set(True)
        
        # Add particle system
        bpy.ops.object.particle_system_add()
        
        # Get the particle system
        particle_system = self.mesh_obj.particle_systems[-1]
        settings = particle_system.settings
        
        # Configure for hair/grass
        settings.type = 'HAIR'
        settings.count = self.particle_count
        
        # Hair length and variation
        settings.hair_length = self.grass_length
        settings.hair_step = 3  # Fewer steps for performance
        
        # Random settings for natural look
        settings.use_advanced_hair = True
        settings.use_hair_bspline = True
        
        # IMPORTANT: Make grass grow upright
        settings.use_emit_random = False
        settings.emit_from = 'FACE'
        settings.use_even_distribution = True
        
        # Use normal direction (upward from surface)
        settings.normal_factor = 1.0  # Follow surface normal
        settings.tangent_factor = 0.0  # No tangent influence
        settings.tangent_phase = 0.0
        
        # Minimal randomness for upright growth
        settings.factor_random = 0.1  # Very little random direction
        settings.length_random = 0.2  # Some height variation
        settings.rotation_factor_random = 0.3  # Small rotation only
        
        # Children for clumping effect
        settings.child_type = 'INTERPOLATED'
        settings.rendered_child_count = self.clump_children
        settings.child_length = 0.8
        settings.child_length_random = 0.3
        settings.clump_factor = 0.6
        settings.clump_shape = 0.2
        
        # Roughness for Studio Ghibli organic feel
        settings.roughness_1 = 0.15
        settings.roughness_1_size = 0.5
        settings.roughness_2 = 0.1
        settings.roughness_2_size = 0.2
        
        print(f"Created particle system with {self.particle_count} particles")
        return particle_system
    
    def create_grass_material(self):
        """Create a simple grass material"""
        # Create material for grass
        grass_material = bpy.data.materials.new(name="GrassMaterial")
        grass_material.use_nodes = True
        
        # Get nodes
        nodes = grass_material.node_tree.nodes
        links = grass_material.node_tree.links
        
        # Clear default nodes
        nodes.clear()
        
        # Add nodes
        output_node = nodes.new(type='ShaderNodeOutputMaterial')
        bsdf_node = nodes.new(type='ShaderNodeBsdfPrincipled')
        
        # Set grass color (Studio Ghibli green)
        bsdf_node.inputs['Base Color'].default_value = (0.3, 0.7, 0.2, 1.0)
        bsdf_node.inputs['Roughness'].default_value = 0.8
        
        # Link nodes
        links.new(bsdf_node.outputs['BSDF'], output_node.inputs['Surface'])
        
        output_node.location = (400, 0)
        bsdf_node.location = (0, 0)
        
        return grass_material
    
    def convert_particles_to_mesh(self, particle_system):
        """Convert particle system to mesh geometry"""
        print("Converting particles to mesh...")
        
        # Duplicate the mesh for conversion
        bpy.ops.object.duplicate()
        converted_obj = bpy.context.active_object
        converted_obj.name = "GrassConverted"
        
        # Convert particles to mesh
        bpy.context.view_layer.objects.active = converted_obj
        
        # Convert hair to mesh
        bpy.ops.object.modifier_convert(modifier=particle_system.name)
        
        # Update mesh
        bpy.context.view_layer.update()
        
        print("Particles converted to mesh")
        return converted_obj
    
    def apply_vertex_colors(self, grass_obj):
        """Apply vertex colors to the grass mesh based on original surface"""
        print("Applying vertex colors...")
        
        # Ensure we're in object mode
        bpy.context.view_layer.objects.active = grass_obj
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Add vertex color attribute if it doesn't exist
        if not grass_obj.data.vertex_colors:
            grass_obj.data.vertex_colors.new()
        
        color_layer = grass_obj.data.vertex_colors.active
        
        # Sample colors from original mesh material
        original_color = self.get_material_base_color()
        
        # Apply green-tinted version of original color to all vertices
        grass_color = self.make_grass_color(original_color)
        
        # Apply to all face corners
        for poly in grass_obj.data.polygons:
            for loop_index in poly.loop_indices:
                # Add some random variation
                varied_color = [
                    grass_color[0] + random.uniform(-0.1, 0.1),
                    grass_color[1] + random.uniform(-0.1, 0.1),
                    grass_color[2] + random.uniform(-0.1, 0.1),
                    1.0
                ]
                
                # Clamp values
                for i in range(3):
                    varied_color[i] = max(0, min(1, varied_color[i]))
                
                color_layer.data[loop_index].color = varied_color
        
        print("Vertex colors applied")
    
    def get_material_base_color(self):
        """Get base color from original mesh material"""
        if not self.mesh_obj.material_slots:
            return (0.5, 0.5, 0.5)  # Default gray
            
        material = self.mesh_obj.material_slots[0].material
        if not material or not material.use_nodes:
            return (0.5, 0.5, 0.5)
            
        # Find principled BSDF node
        for node in material.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                base_color = node.inputs['Base Color']
                if base_color.is_linked:
                    # If linked to texture, use a default that works with textures
                    return (0.4, 0.6, 0.3)
                else:
                    # Use the default value
                    return base_color.default_value[:3]
        
        return (0.5, 0.5, 0.5)
    
    def make_grass_color(self, base_color):
        """Convert base color to grass-like color"""
        # Enhance green component while preserving some original character
        grass_color = [
            base_color[0] * 0.6 + 0.2,  # Reduce red, add some
            base_color[1] * 0.8 + 0.4,  # Enhance green significantly  
            base_color[2] * 0.5 + 0.1   # Reduce blue, add a little
        ]
        
        # Ensure it stays grass-like
        grass_color[1] = max(grass_color[1], 0.5)  # Minimum green
        
        # Clamp all values
        for i in range(3):
            grass_color[i] = max(0, min(1, grass_color[i]))
            
        return grass_color
    
    def merge_with_original(self, grass_obj):
        """Merge grass with original mesh"""
        print("Merging grass with original mesh...")
        
        # Select both objects
        bpy.ops.object.select_all(action='DESELECT')
        self.mesh_obj.select_set(True)
        grass_obj.select_set(True)
        
        # Make original mesh active
        bpy.context.view_layer.objects.active = self.mesh_obj
        
        # Join objects
        bpy.ops.object.join()
        
        print("Grass merged with original mesh")
        return self.mesh_obj
    
    def cleanup_particle_system(self):
        """Remove the particle system after conversion"""
        print("Cleaning up particle system...")
        
        # Remove particle system from original mesh
        bpy.context.view_layer.objects.active = self.mesh_obj
        
        if self.mesh_obj.particle_systems:
            particle_system = self.mesh_obj.particle_systems[0]
            bpy.ops.object.particle_system_remove()
        
        print("Particle system removed")
    
    def generate_grass(self):
        """Main function to generate grass"""
        print("Starting grass generation with particle system...")
        
        # Create particle system
        particle_system = self.create_grass_particle_system()
        
        # Force viewport update to generate particles
        bpy.context.view_layer.update()
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Convert to mesh
        grass_obj = self.convert_particles_to_mesh(particle_system)
        
        # Apply colors
        self.apply_vertex_colors(grass_obj)
        
        # Merge with original (optional - comment out if you want separate objects)
        final_obj = self.merge_with_original(grass_obj)
        
        # Clean up particle system on original
        self.cleanup_particle_system()
        
        print("Grass generation complete! Ready for GLB export.")
        return final_obj

def generate_particle_grass():
    """Main function to run from Blender"""
    # Get active object
    if not bpy.context.active_object:
        print("Please select a mesh object")
        return
    
    mesh_obj = bpy.context.active_object
    if mesh_obj.type != 'MESH':
        print("Selected object is not a mesh")
        return
    
    # Create grass generator
    generator = ParticleGrassGenerator(
        mesh_obj=mesh_obj,
        particle_count=10000,  # 10,000 particles as requested
        grass_length=0.12,     # Adjust grass height
        clump_children=5       # Children per particle for thickness
    )
    
    # Generate grass
    final_obj = generator.generate_grass()
    
    print("Grass generation complete!")
    print("The mesh is now ready for GLB export.")

# Run the script
if __name__ == "__main__":
    generate_particle_grass()