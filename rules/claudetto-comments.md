---
paths:
  # JavaScript / TypeScript
  - "**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"

  # Python / Cython
  - "**/*.{py,pyw,pyi,pyx,pxd}"

  # C / C++ / Objective-C
  - "**/*.{c,h,cc,cpp,cxx,c++,cp,C,hh,hpp,hxx,h++,ipp,inl,tpp,ixx,cppm,m,mm}"

  # C# / F# / Visual Basic
  - "**/*.{cs,csx,fs,fsi,fsx,vb,vbs}"

  # Java / Kotlin / Scala / Groovy
  - "**/*.{java,kt,kts,scala,sc,groovy}"

  # Rust / Go / Swift / Dart
  - "**/*.{rs,go,swift,dart}"

  # Ruby / PHP / Perl
  - "**/*.{rb,rake,gemspec,php,phtml,pl,pm}"

  # Lua / Luau
  - "**/*.{lua,luau}"

  # Shell / PowerShell / Batch
  - "**/*.{sh,bash,zsh,fish,ksh,ps1,psm1,bat,cmd}"

  # SQL
  - "**/*.{sql,psql,pgsql,plsql}"

  # Functional Languages
  - "**/*.{ex,exs,erl,hrl,hs,lhs,ml,mli,re,rei,res,resi,clj,cljs,cljc,elm}"

  # Lisp / Scheme
  - "**/*.{lisp,lsp,scm,rkt,el}"

  # Scientific Computing
  - "**/*.{r,R,jl,f,for,f90,f95,F90,m}"

  # Other Established Languages
  - "**/*.{zig,nim,cr,d,di,ada,adb,ads,pas,pp,cob,cbl,tcl,awk}"

  # Assembly
  - "**/*.{asm,s,S,inc}"

  # Web Components / Templates
  - "**/*.{vue,svelte,astro,html,htm,razor,cshtml,erb,ejs,pug,hbs,jinja,jinja2,twig,liquid}"

  # CSS / Preprocessors
  - "**/*.{css,scss,sass,less,styl}"

  # GraphQL / Interface Definitions
  - "**/*.{graphql,gql,proto,thrift}"

  # GPU / Shaders
  - "**/*.{cu,cuh,hip,cl,glsl,vert,frag,comp,hlsl,hlsli,metal,wgsl}"

  # Hardware Description
  - "**/*.{v,vh,sv,svh,vhd,vhdl}"

  # Game Development
  - "**/*.{gd,gdshader,shader,compute}"

  # Build / Automation Languages
  - "**/*.{nix,dhall,tf,hcl,bzl,bazel,cmake,mk,make,gradle,sbt,ninja,just}"

  # Make / CMake
  - "**/{Makefile,GNUmakefile,BSDmakefile,CMakeLists.txt}"

  # Xmake / Premake
  - "**/{xmake.lua,premake4.lua,premake5.lua}"

  # Just
  - "**/{justfile,Justfile,.justfile}"

  # Meson
  - "**/{meson.build,meson_options.txt}"

  # SCons
  - "**/{SConstruct,SConscript}"

  # Rake
  - "**/Rakefile"

  # Bazel / Buck / Pants
  - "**/{BUILD,BUILD.bazel,BUCK,WORKSPACE,WORKSPACE.bazel}"

  # Docker
  - "**/Dockerfile"
  - "**/Dockerfile.*"

  # Other Build Systems
  - "**/{Taskfile.yml,Taskfile.yaml,build.gradle,build.gradle.kts,build.mill,pom.xml}"
---

A comment explains the why, not the what. Clear function and variable names already carry the what.

Write a comment for one of these:

- a design decision, a business rule, or an unusual constraint behind a non-obvious choice;
- a workaround or a bug fix, with the reason it is there, such as a ticket or a known defect of a
  dependency;
- an algorithm that is heavy in math, bitwise work, or sequence, and cannot be made simpler;
- a public API, as a docstring that gives the parameters, the return value, and the expected use;
- unfinished work, as a `TODO` or a `FIXME` marker;
- an external reference: the URL of the docs, of a thread, or of the origin of copied code.

Write no comment for these:

- what the code already says, such as `i++ // increment i by 1`;
- unreadable code. Rename the parts and split the function instead, because a comment leaves the
  code unreadable;
- a standard feature of the language or an obvious import;
- the task, the plan, the spec, or the requirement you are working from. That text is archived when
  the work lands, so the pointer dies and the reader is left with a name that resolves to nothing;
- your own work, your session, or your reasoning. The next reader has the code, not the session.

Correct or delete a comment in the same edit as the code it describes. A stale comment misleads,
which is worse than no comment.
