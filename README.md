# Protod

This is a tool for consuming [Protocol Buffer DSL
files](https://developers.google.com/protocol-buffers/docs/proto3) and
extracting Messages and Enums out, converting them into TypeScript native code.

This is somewhat similar to the [official `protoc`
binary](https://github.com/protocolbuffers/protobuf), in that it can be used to
generate code from the DSL, but this tool is very different in that it is fully
written in TypeScript, and is designed to only output TypeScript.


### Potential Questions Asked

#### What does the output look like?

You can compare the example `.proto` and `.pb.ts` files in the [`./testdata/`
directory](./testdata). They are designed to look like files a human might
actually write; readability is important for debugability!

#### Why isn't this a plugin for protoc?

That would have potentially been much easier than writing an entire Protocol
Buffers DSL parser from scratch, but there are several reasons why this tool
was created:
 
 - The `protoc` binary is seriously unwieldy to use.
 - The Protocol Buffer "standard" is a single C library which is a manually
   written tokenizer/parser, and could really do with some alternative
   implementations.
 - Being fully written in TypeScript (the parser and generator) makes it easier
   for developers to get involved in the tooling.
 - The plan for this tool is to grow into linting, formatting, and doc
   generation, in the spirit of Deno/Go.

Having said that, this tool - not being officially supported - should be
considered caveat emptor. There are likely bugs or inconsistencies between this
and official implementations. If you find one, please send a PR with a failing
test!

#### Why not just use the JS protoc plugin?

Well, aside from answering some of that in the above question, there are also
some problems with the official JS plugin. Chiefly:

 - It's written JS first, and while it does have TypeScript definitions, which
   means for example Enums are not TypeScript first class Enums.
 - The output is also relatively difficult to read - given it uses non-standard
   JS features such as the Google Closure Compiler module system.
 - The API the generated code features is a little unwieldy too. Method names
   like `setName()`, `setAge()` are used rather than simple field properties.
