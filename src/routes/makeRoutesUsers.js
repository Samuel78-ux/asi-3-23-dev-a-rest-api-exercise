import UserModel from "../db/models/UserModel.js"
import { InvalidAccessError, NotFoundError } from "../errors.js"
import auth from "../middlewares/auth.js"
import mw from "../middlewares/mw.js"
import checkPermission from "../middlewares/perms.js"
import validate from "../middlewares/validate.js"
import { sanitizeUser } from "../sanitizers.js"
import {
  emailValidator,
  idValidator,
  nameValidator,
  queryLimitValidator,
  queryOffsetValidator,
} from "../validators.js"

const makeRoutesUsers = ({ app }) => {
  const checkIfUserExists = async (userId) => {
    const user = await UserModel.query().findById(userId)

    if (user) {
      return user
    }

    throw new NotFoundError()
  }

  app.get(
    "/users",
    auth,
    checkPermission("read", "users"),
    validate({
      query: {
        limit: queryLimitValidator,
        offset: queryOffsetValidator,
      },
    }),
    mw(async (req, res) => {
      const { limit, offset } = req.data.query
      const users = await UserModel.query().limit(limit).offset(offset)

      res.send({ result: sanitizeUser(users) })
    })
  )

  app.get(
    "/users/:userId",
    auth,
    checkPermission("read", "users"),
    validate({
      params: { userId: idValidator.required() },
    }),
    mw(async (req, res) => {
      const { userId } = req.data.params
      const user = await UserModel.query().findById(userId)

      if (!user) {
        return
      }

      res.send({ result: sanitizeUser(user) })
    })
  )

  app.patch(
    "/users/:userId",
    auth,
    validate({
      params: { userId: idValidator.required() },
      body: {
        firstName: nameValidator,
        lastName: nameValidator,
        email: emailValidator,
      },
    }),
    mw(async (req, res) => {
      const {
        data: {
          body: { firstName, lastName, email },
          params: { userId },
        },
        session: { user: sessionUser },
      } = req

      if (userId !== sessionUser.id) {
        throw new InvalidAccessError()
      }

      const user = await checkIfUserExists(userId, res)

      if (!user) {
        return
      }

      const updatedUser = await UserModel.query().updateAndFetchById(userId, {
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(email ? { email } : {}),
      })

      res.send({ result: sanitizeUser(updatedUser) })
    })
  )

  app.delete(
    "/users/:userId",
    auth,
    checkPermission("delete", "users"),
    validate({
      params: { userId: idValidator.required() },
    }),
    mw(async (req, res) => {
      const { userId } = req.data.params
      const user = await checkIfUserExists(userId, res)

      if (!user) {
        return
      }

      await UserModel.query().deleteById(userId)

      res.send({ result: sanitizeUser(user) })
    })
  )
}

export default makeRoutesUsers
