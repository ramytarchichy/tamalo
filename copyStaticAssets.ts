import * as shell from 'shelljs'

shell.cp('-R', 'src/views', 'dist/')
shell.cp('-R', 'src/public', 'dist/')
shell.rm(shell.ls(['dist/public/res/scripts/*.ts']))
