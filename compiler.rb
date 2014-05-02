require "./glsl_min"

USE_CLOSURE = true
USE_GLSL_MIN = true

MDX_SHADERS = [
  "vsmain",
  "vsribbons",
  "vsparticles",
  "vscolor",
  "psmain",
  "psparticles"
]

M3_SHADERS = [
  "vscommon",
  "vsstandard",
  "vscolor",
  "pscommon",
  "psstandard",
  "psspecialized",
  "vsparticles",
  "psparticles"
]

SHARED_SHADERS = [
  "vsbonetexture",
  "decodefloat",
  "vsworld",
  "vswhite",
  "psworld",
  "pswhite",
  "pscolor"
]

CODE_FILES = [
  "math/gl-matrix",
  "math/gl-matrix-addon",
  "math/math",
  "math/interpolator",
  "binaryreader/binaryreader",
  "base",
  "gl/before",
  "gl/shader",
  "gl/jpg",
  "gl/texture",
  "gl/blptexture",
  "gl/ddstexture",
  "gl/rect",
  "gl/cube",
  "gl/sphere",
  "gl/cylinder",
  "gl/gl",
  "gl/after",
  "viewer/before",
  "viewer/shaders",
  "viewer/mdx/before",
  "viewer/mdx/parser",
  "viewer/mdx/sd",
  "viewer/mdx/skeleton",
  "viewer/mdx/collisionshape",
  "viewer/mdx/model",
  "viewer/mdx/modelinstance",
  "viewer/mdx/texture",
  "viewer/mdx/geoset",
  "viewer/mdx/layer",
  "viewer/mdx/geosetanimation",
  "viewer/mdx/textureanimation",
  "viewer/mdx/node",
  "viewer/mdx/attachment",
  "viewer/mdx/particle",
  "viewer/mdx/particleemitter",
  "viewer/mdx/particle2",
  "viewer/mdx/particleemitter2",
  "viewer/mdx/ribbon",
  "viewer/mdx/ribbonemitter",
  "viewer/mdx/after",
  "viewer/m3/before",
  "viewer/m3/parser",
  "viewer/m3/sd",
  "viewer/m3/sts",
  "viewer/m3/stc",
  "viewer/m3/stg",
  "viewer/m3/skeleton",
  "viewer/m3/boundingshape",
  "viewer/m3/region",
  "viewer/m3/layer",
  "viewer/m3/standardmaterial",
  "viewer/m3/model",
  "viewer/m3/modelinstance",
  #"viewer/m3/particle",
  #"viewer/m3/particleemitter",
  "viewer/m3/after",
  "viewer/model",
  "viewer/modelinstance",
  "viewer/after"
]

def handle_shaders(use_glsl_min, shared, mdx, m3, srcpath, output)
  names = shared + mdx.map { |p| "w" + p } + m3.map { |p| "s" + p }
  paths = shared.map { |p| srcpath + "sharedshaders/" + p + ".c" } + mdx.map { |p| srcpath + "mdx/shaders/" + p + ".c" } + m3.map { |p| srcpath + "m3/shaders/" + p + ".c" }
  shaders = []
  
  if use_glsl_min
    minified = minify_files(paths , false)
    
    names.each_index { |i|
      shaders.push("\"#{names[i]}\":\"#{minified[0][i]}\"")
    }
    
    File.open(srcpath + output, "w") { |out|
      out.write("// Note: this file is automatically generated.\n\nvar SHADERS = {\n\t#{shaders.join(",\n\t")}\n};")
    }
  else
    names.each_index { |i|
      shaders.push("\"#{names[i]}\":\"#{IO.read(paths[i]).gsub("\n", "\\n")}\"")
    }
    
    File.open(srcpath + output, "w") { |out|
      out.write("// Note: this file is automatically generated.\n\nvar SHADERS = {\n\t#{shaders.join(",\n\t")}\n};")
    }
  end
end

def handle_source(paths, use_closure, output)
    File.open("model_viewer_monolith.js", "w") { |output|
      output.write("(function () {\n")
      output.write("\"use strict\";\n")
      
      paths.each { |file|
        output.write("\n")
        output.write(IO.read("src/" + file + ".js"))
        output.write("\n")
      }
      
      output.write("}());")
    }
	
    if use_closure
      system("java -jar compiler.jar --js model_viewer_monolith.js --js_output_file model_viewer_monolith_min.js");
    else
      File.open("model_viewer_monolith_min.js", "w") { |output|
        File.open("model_viewer_monolith.js", "r") { |input|
          output.write(input.read())
        }
      }
	end
  
    File.open("model_viewer_monolith_min.js", "r") { |input|
      File.open(output, "w") { |output|
        output.write("// Copyright (c) 2014 Chananya Freiman (aka GhostWolf)\n")
        
        if use_closure
          output.write("(function(){")
          output.write("\"use strict\";")
        end
        
        output.write(input.read())
        
        if USE_CLOSURE
          output.write("}());")
        end
        
      }
    }

    File.delete("model_viewer_monolith.js")
    File.delete("model_viewer_monolith_min.js")
end

handle_shaders(USE_GLSL_MIN, SHARED_SHADERS, MDX_SHADERS, M3_SHADERS, "src/viewer/", "shaders.js")
handle_source(CODE_FILES, USE_CLOSURE, "viewer.js")
