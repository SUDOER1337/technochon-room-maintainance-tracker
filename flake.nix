{
  description = "CTC Clean Tracker - classroom inspection app";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      pkgsFor = system: nixpkgs.legacyPackages.${system};
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = pkgsFor system;
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              nodePackages.npm
            ];

            shellHook = ''
              echo "CTC Clean Tracker dev shell"
              echo "  npm install    Install dependencies"
              echo "  npm run dev    Start Vite dev server (port 7170)"
              echo "  npm run build  Build production app to dist/"
              echo "  npm run preview  Preview production build"
            '';
          };
        }
      );

      formatter = forAllSystems (system: (pkgsFor system).nixfmt-rfc-style);
    };
}
