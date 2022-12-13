import { useAuth } from './use-auth'
import { Storage } from '@stacks/storage'
import { IPrivateFile, IPublicFile, PrivateMetadataFile, PublicMetadataFile } from '@/types/storage'
import { useState } from 'react'
import useLoading from './use-loading'
import { useToast } from '@chakra-ui/react'
import { AppConfig, UserSession } from '@stacks/connect'

const PRIVATE_METADATA_FILE_PATH = '.private/metadata.json'
const PUBLIC_METADATA_FILE_PATH = 'https://json-server-heroku-eth.herokuapp.com/public'

export const useStorage = () => {
  const { userSession, userData } = useAuth()
  const [metadata, setMetadata] = useState<PrivateMetadataFile | undefined>()
  const [publicMetadata, setPublicMetadata] = useState<PublicMetadataFile | undefined>()

  const {
    isLoading: isMetadataRefreshing,
    startLoading: startMetadataRefreshingLoading,
    stopLoading: stopMetadataRefreshingLoading,
  } = useLoading()
  const toast = useToast()

  const storage = new Storage({ userSession })

  const refreshMetadata = async () => {
    startMetadataRefreshingLoading()
    try {
      const resMetadata = await getMetadataFile()
      console.log('resMetadata')
      console.log(resMetadata)
      setMetadata(resMetadata)

      const resOverview = await getOverviewFile()
      console.log('resOverview')
      console.log(resOverview)
      setPublicMetadata(resOverview)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Error fetching files',
        description: 'Something went wrong when fetching the files. Please try again later',
        status: 'error',
      })
    }
    stopMetadataRefreshingLoading()
  }

  const saveFile = async (
    path: string,
    data: any,
    isPublic: boolean = false,
    shared: boolean = false,
    isString: boolean = true
  ) => {
    const existingMetadata = await getMetadataFile()
    const existingOverviewMetadata = await getOverviewFile()

    const url = await storage.putFile(path, data, {
      encrypt: !isPublic,
      cipherTextEncoding: 'base64',
      dangerouslyIgnoreEtag: true,
      wasString: isString,
    })

    const currentFileMetadata: IPrivateFile = {
      path,
      isPublic,
      lastModified: new Date().toISOString(),
      url,
      shared,
      isString,
    }

    // Private Metadata
    if (existingMetadata) {
      const newMetadata: PrivateMetadataFile = existingMetadata
      if (existingMetadata.files) {
        newMetadata.files = {
          ...existingMetadata.files,
          [path]: currentFileMetadata,
        }
      }
      await saveMetadataFile(newMetadata)
    } else {
      await saveMetadataFile({
        files: { [path]: currentFileMetadata },
      })
    }

    const userAddress = userData?.profile.stxAddress.testnet

    const currentPublicMetadata: IPublicFile = {
      userAddress,
      path,
      isPublic,
      lastModified: new Date().toISOString(),
      url,
      shared,
      isString,
    }

    // console.log('Object.keys(existingOverviewMetadata).length')
    // console.log(Object.keys(existingOverviewMetadata).length)

    // Public Metadata -> Overview of all files
    // if (Object.keys(existingOverviewMetadata).length !== 0) {
    if (existingOverviewMetadata) {
      // console.log('existingOverviewMetadata')
      // console.log(existingOverviewMetadata)
      const newOverviewMetadata: PublicMetadataFile = existingOverviewMetadata
      if (existingOverviewMetadata.files) {
        newOverviewMetadata.files = {
          ...existingOverviewMetadata.files,
          [path]: currentPublicMetadata,
        }
      }
      await saveOverviewFile(newOverviewMetadata)
    } else {
      await saveOverviewFile({
        files: { [path]: currentPublicMetadata },
      })
    }

    await refreshMetadata()

    return url
  }

  const getFileWithMeta = async (filename: string) => {
    const fileMeta = await getFileMetadata(filename)
    const res = await storage.getFile(filename, {
      decrypt: !fileMeta.isPublic,
    })

    return { meta: fileMeta, data: res }
  }

  // Get File which belongs to logged in user
  const getFile = async (filename: string, doDecrypt: boolean = true) => {
    const res = await storage.getFile(filename, {
      decrypt: doDecrypt,
    })

    return res
  }

  // Get File which is usually encrypted
  const getEncryptedFile = async (path: string) => {
    try {
      console.log(path)
      return await fetch(path)
        .then((response) => response.json())
        .then((data) => {
          return data
        })
    } catch (err) {
      console.error(err)
    }
  }

  const getMetadataFile = async () => {
    // console.log('getMetadataFile')
    try {
      const metadata = await storage.getFile(PRIVATE_METADATA_FILE_PATH, {
        decrypt: true,
      })
      if (!metadata) return null
      return JSON.parse(metadata as string)
    } catch (err) {
      console.error(err)
    }
  }

  const getOverviewFile = async () => {
    // console.log('getOverviewFile')
    try {
      return await fetch(PUBLIC_METADATA_FILE_PATH)
        .then((response) => response.json())
        .then((data) => {
          // return data -> Ohne encryption
          // console.log('data')
          // console.log(JSON.stringify(data))

          // This happens if file is empty -> {}
          if (Object.keys(data).length === 0) {
            return null
          }
          return userSession
            .decryptContent(JSON.stringify(data), {
              privateKey: '4e185081062dd819e0f251864817957704f17bb07baef49fa447bbbeb8b143e5',
            })
            .then((res) => {
              // console.log(res)
              if (!res) return null
              // console.log('res')
              // console.log(res)
              return JSON.parse(res as string)
            })
        })
    } catch (err) {
      console.error(err)
    }
  }

  const getFileMetadata = async (path: string) => {
    const metadata = await getMetadataFile()
    const publicMetadata = await getOverviewFile()
    if (!metadata) {
      return null
    }
    // File of Logged In User
    else if (metadata.files[path]) {
      return metadata.files[path]
    }
    // File of NOT Logged In User
    else {
      return publicMetadata.files[path]
    }
  }

  const saveMetadataFile = async (metadata: any) => {
    await storage.putFile(PRIVATE_METADATA_FILE_PATH, JSON.stringify(metadata), {
      encrypt: true,
      dangerouslyIgnoreEtag: true,
      wasString: true,
    })
  }

  // Store Overview File
  const saveOverviewFile = async (metadata: any) => {
    // console.log('saveOverviewFile')
    // console.log(JSON.stringify(metadata))
    const encrypted = await userSession.encryptContent(JSON.stringify(metadata), {
      privateKey: '4e185081062dd819e0f251864817957704f17bb07baef49fa447bbbeb8b143e5',
    })

    // console.log('encrypted')
    // console.log(encrypted)

    try {
      return await fetch(PUBLIC_METADATA_FILE_PATH, {
        method: 'PUT',
        headers: {
          'Content-type': 'application/json',
        },
        // body: JSON.stringify(metadata),
        body: encrypted,
      })
        .then((response) => {
          response.json()
        })
        .then((data) => {
          console.log('Success:', data)
        })
    } catch (err) {
      console.error(err)
    }
  }

  const deleteFile = async (path: string) => {
    const existingMetadata = await getMetadataFile()
    const existingOverviewMetadata = await getOverviewFile()

    // Private Metadata
    const newMetadata: PrivateMetadataFile = {
      ...existingMetadata,
      files: { ...existingMetadata.files, [path]: undefined },
    }

    await saveMetadataFile(newMetadata)

    await storage.deleteFile(path)

    // Public Metadata -> Overview of all files

    const newOverviewMetadata: PublicMetadataFile = {
      ...existingOverviewMetadata,
      files: { ...existingOverviewMetadata.files, [path]: undefined },
    }

    await saveOverviewFile(newOverviewMetadata)

    await refreshMetadata()
  }

  const shareFile = async (path: string) => {
    const existingMetadata = await getMetadataFile()
    const existingOverviewMetadata = await getOverviewFile()

    const file = existingMetadata.files[path]
    console.log(file)

    const data = await getFile(path)
    console.log(data)

    // Delete Private Metadata
    const newMetadata: PrivateMetadataFile = {
      ...existingMetadata,
      files: { ...existingMetadata.files, [path]: undefined },
    }

    await saveMetadataFile(newMetadata)

    await storage.deleteFile(path)

    // Delete Public Metadata
    const newOverviewMetadata: PublicMetadataFile = {
      ...existingOverviewMetadata,
      files: { ...existingOverviewMetadata.files, [path]: undefined },
    }

    await saveOverviewFile(newOverviewMetadata)

    await refreshMetadata()

    const encryptedData = await userSession.encryptContent(JSON.stringify(data), {
      privateKey: '4e185081062dd819e0f251864817957704f17bb07baef49fa447bbbeb8b143e5',
    })

    await saveFile(path, encryptedData, true, true, file.dataType)
  }

  const deleteAllFiles = async () => {
    const paths: string[] = []
    await storage.listFiles((path) => {
      paths.push(path)
      return true
    })

    for (const path of paths) {
      await storage.deleteFile(path)
      console.log(`delete ${path}`)
    }
  }

  const deletePublicFile = async () => {
    try {
      return await fetch(PUBLIC_METADATA_FILE_PATH, {
        method: 'PUT',
        headers: {
          'Content-type': 'application/json',
        },
        // body: JSON.stringify(metadata),
        body: '',
      }).then((response) => {
        console.log('response: ' + JSON.stringify(response))
        return response.json()
      })
    } catch (err) {
      console.error(err)
    }
  }

  const test = async () => {
    // const str =
    //   '{"iv":"1ba3577147464b7fe41bf4194b1b2ee1","ephemeralPK":"037d3cda2139aca911d02259be49e3343d6708bfa42d08fb9f75784d946bbdcc71","cipherText":"dfd5fa916f976f515b4485e3019133b9","mac":"ef1fd15eaaf24b4de7408bf3b229ad0aa04f00de346908dc6b994772e3bb5200","wasString":true}'
    // await userSession.decryptContent(str).then((res) => {
    //   console.log('res')
    //   console.log(res)
    // })

    console.log('metadata')
    console.log(metadata)

    console.log('publicMetadata')
    console.log(publicMetadata)
  }

  return {
    storage,
    saveFile,
    getFile,
    getEncryptedFile,
    getFileWithMeta,
    getMetadataFile,
    getFileMetadata,
    saveMetadataFile,
    shareFile,
    deleteFile,
    deleteAllFiles,
    deletePublicFile,
    metadata,
    publicMetadata,
    refreshMetadata,
    isMetadataRefreshing,
    test,
  }
}
