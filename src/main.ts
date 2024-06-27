const fs = require("node:fs");
const path2 = require("node:path");
const ts = require("typescript");

const mps = new Map();

function require2(path: string) {
    return $require(path);
}

const BuiltinModules = [
    "fs",
    "http",
    "https",
    "path",
    "url",
    "os",
    "buffer",
    "net",
    "tls",
    "crypto",
    "stream",
    "zlib",
    "assert",
    "events",
    "util",
    "querystring",
    "readline",
    "child_process",
    "cluster",
    "dns",
    "domain",
    "tty",
    //...
];

function $require(path: string, dir: string = __dirname) {
    if (isBuiltinModule(path) === true) {
        return require(path);
    }

    if (!/^((.\/)|(\/)|(..\/)|([a-zA-z]+\:)).*?/.test(path)) {
        path = findNodeModule(path, dir);
        console.log(path)
        if (path === null) {
            return void 0;
        }
    } else {
        path = path2.resolve(dir, path);
    }

    return _require(path);
}

const fileTypes = ".js,.ts,.json".split(",");

const codes: string[] = [];

function _require(path: string): Record<string, any> | undefined {
    if (path == null || !path.length) {
        return void 0;
    }

    if (mps.has(path)) {
        return mps.get(path);
    }

    let currentFiles,
        resultCode: any = null;
    let isDirectory = false;
    try {
        isDirectory = fs.statSync(path).isDirectory();
    } catch {}
    if (!/.*(\.[a-z]+)$/i.test(path) || isDirectory) {
        let prevPath = path;
        try {
            currentFiles = fs.readdirSync(path);

            if (currentFiles.length === 0) {
                throw new Error();
            } else {
                if (currentFiles.indexOf("package.json") > -1) {
                    try {
                        const packageResult = fs.readFileSync(
                            path2.join(prevPath, "/package.json"),
                            "utf8"
                        );

                        const indexMainPath = JSON.parse(packageResult).main;

                        if (indexMainPath.length) {
                            path = path2.join(prevPath, indexMainPath);
                        }
                    } catch {}
                }

                if (
                    currentFiles.indexOf("index.js") > -1 &&
                    path === prevPath
                ) {
                    path = path2.join(prevPath, "/index.js");
                }
            }
        } catch (err) {}

        if (!currentFiles) {
            path = prevPath + ".js";
        } else if (path === prevPath) {
            return void 0;
        }

        mps.set(prevPath, _require(path));

        return mps.get(prevPath);
    } else {
        if (!fileTypes.some((ii: string) => path.endsWith(ii))) {
            path += ".js";
        }
    }

    const _module = {
        exports: {},
    };

    {
        resultCode =
            resultCode !== null ? resultCode : fs.readFileSync(path, "utf8");
    }

    const fileType = path2.extname(path);
    if (fileType === ".json") {
        _module.exports = JSON.parse(resultCode);
    } else {
        if (fileType.endsWith("ts")) {
            resultCode = ts.transpileModule(resultCode, {
                compilerOptions: {
                    target: ts.ScriptTarget.ES2015,
                    module: ts.ModuleKind.CommonJS,
                    moduleResolution: ts.ModuleResolutionKind.NodeJs,
                },
            }).outputText;
        }

        const currentFileDirName = path2.join(path, "../");

        // console.clear();
        codes.push(resultCode);

        fs.writeFileSync("./index.json", JSON.stringify(codes), "utf8");

        new Function(
            `require, module, exports, __dirname, __filename, process`,
            `exports = module; ${resultCode}`
        ).apply(_module, [
            function require(path: string) {
                return $require(path, currentFileDirName);
            },
            _module,
            _module.exports,
            currentFileDirName,
            path,
            process,
        ]);
    }

    mps.set(path, _module.exports);

    return _module.exports;
}

function findNodeModule(moduleName: string, startDir: string) {
    let dir = startDir || process.cwd(); // 默认从当前工作目录开始

    while (true) {
        const nodeModulesPath = path2.join(dir, "node_modules", moduleName);

        const nodeModulesPath2 = path2.join(
            dir,
            "node_modules",
            moduleName + ".js"
        );

        if (fs.existsSync(nodeModulesPath)) {
            // 找到模块，返回其路径
            return nodeModulesPath;
        }

        if (fs.existsSync(nodeModulesPath2)) {
            return nodeModulesPath2;
        }

        const parentDir = path2.dirname(dir);

        // 如果到达根目录或上一级目录与当前目录相同，说明没有更多目录可以查找
        if (parentDir === dir || parentDir === "/") {
            // 没有找到模块，返回 null 或抛出错误
            return null; // 或者 throw new Error(`Cannot find module '${moduleName}'`);
        }

        // 移动到上一级目录继续查找
        dir = parentDir;
    }
}

function isBuiltinModule(moduleName: string) {
    return BuiltinModules.indexOf(moduleName) > -1;
}

console.log(require2("./"));
