import fs from 'node:fs'
import path from 'node:path'

import express, { Request, Response } from 'express'
import ejsLayouts from 'express-ejs-layouts'
import fileUpload from 'express-fileupload'
import { v4 as uuidv4 } from 'uuid'

import { darker } from './index'

const STORAGE_DIR = 'storage'

if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR)

const app = express()

const imagesPath = path.join(__dirname, STORAGE_DIR)

app.use(fileUpload())
app.set('view engine', 'ejs')
app.use(ejsLayouts)
app.use('/storage', express.static(imagesPath))
app.use(express.urlencoded({ extended: true }))

app.get('/', async (_: Request, res: Response) => {
  try {
    let files = await fs.promises.readdir(imagesPath)

    const abc = async (fileName: string) => {
      const filePath = path.join(__dirname, STORAGE_DIR, fileName)
      const time = (await fs.promises.stat(filePath)).mtime.getTime()

      return { name: fileName, time }
    }

    const newFiles = await Promise.all(files.map(abc))

    files = newFiles.sort((a, b) => a.time - b.time).map((v) => v.name)

    return res.render('upload', { files: files.reverse() })
  } catch (error) {
    return res.sendStatus(500)
  }
})

app.post('/uploads', function (req: Request, res: Response) {
  if (!req.files) return res.sendStatus(400)

  const file = Array.isArray(req.files.upload) ? req.files.upload[0] : req.files.upload
  const extname = path.extname(file.name)
  const uuid = uuidv4()
  const filePath = path.join(__dirname, STORAGE_DIR, `${uuid}${extname}`)

  file.mv(filePath, (err) => {
    if (err) {
      return res.status(500).send(err)
    }
    try {
      darker(filePath, +req.body.saturation)
    } catch (e) {
      return res.sendStatus(500)
    }

    res.redirect('/')
  })
})

app.listen(3000, () => {
  console.info('Server is running :>>')
})
