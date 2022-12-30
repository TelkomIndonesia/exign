import { NextFunction, Request, Response } from 'express'
require('express-async-errors')

export function errorMW (err: Error, _: Request, res: Response, next: NextFunction) {
  if (err) {
    console.log({ error: err })
    res.sendStatus(500)
  }
  next(err)
}
